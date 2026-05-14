import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, ClipboardList, Loader2, Send, Verified } from "lucide-react";
import api from "../api";

const SUGGESTIONS = [
  "I need 300 titanium brackets by July 12",
  "I need 200 steel bearings by August 4",
  "I need 100 aluminum rods by June 25",
  "Show my orders",
];

export default function ChatPanel({ pendingDrafts = [], onDataChanged, onToast, onSessionExpired, isDarkMode }) {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I am your manufacturing assistant. I can only create orders for products available in inventory, validate stock, and generate verification codes.",
      timestamp: new Date().toISOString(),
      entities: null,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const activeDraft = useMemo(() => {
    const fallback = pendingDrafts[0] || null;
    return pendingDrafts.find((draft) => String(draft.id) === String(selectedDraftId)) || fallback;
  }, [pendingDrafts, selectedDraftId]);

  useEffect(() => {
    if (activeDraft) {
      setSelectedDraftId(String(activeDraft.id));
    } else {
      setSelectedDraftId("");
      setVerificationCode("");
    }
  }, [activeDraft]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, confirming]);

  useEffect(() => {
    const handleScroll = () => {
      const element = messagesContainerRef.current;
      if (!element) return;
      setShowScrollTop(element.scrollTop > 120);
    };

    const current = messagesContainerRef.current;
    current?.addEventListener("scroll", handleScroll);
    return () => current?.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    messagesContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const appendMessage = (message) => {
    setMessages((current) => [...current, message]);
  };

  const handleSend = async (rawMessage) => {
    const message = (rawMessage || input).trim();
    if (!message || loading) return;
    setInput("");

    appendMessage({
      id: `${Date.now()}-user`,
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
      entities: null,
    });

    setLoading(true);
    try {
      const { data } = await api.post("/chat", { message });
      appendMessage({
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toISOString(),
        entities: data.extractedEntities || null,
      });

      if (["verification_required", "order_confirmed", "stock_exceeded"].includes(data.action)) {
        onDataChanged?.();
      }
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onSessionExpired?.();
        return;
      }
      onToast?.("Unable to process chat request.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!activeDraft || !verificationCode.trim()) return;
    setConfirming(true);
    try {
      const { data } = await api.post("/orders/confirm", {
        draftId: activeDraft.id,
        verificationCode: verificationCode.trim().toUpperCase(),
      });
      appendMessage({
        id: `${Date.now()}-confirm`,
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toISOString(),
        entities: data.order
          ? {
              orderId: data.order.orderId,
              productName: data.order.productName,
              quantity: data.order.quantity,
              status: data.order.status,
            }
          : null,
      });
      setVerificationCode("");
      onDataChanged?.();
      onToast?.("Order request sent to admin for review.", "success");
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onSessionExpired?.();
        return;
      }
      onToast?.(requestError.response?.data?.error || "Invalid verification code.", "error");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <section className={`relative rounded-[32px] border ${isDarkMode ? 'border-cyan-300/20 bg-gradient-to-br from-slate-950/95 to-slate-900/90 shadow-[0_32px_88px_rgba(6,182,212,0.18)]' : 'border-gray-300/20 bg-gradient-to-br from-white/95 to-slate-100/95 shadow-[0_32px_88px_rgba(15,23,42,0.08)]'} backdrop-blur-xl`}>
      <div className={`border-b ${isDarkMode ? 'border-cyan-300/20 bg-slate-950/35' : 'border-gray-300/20 bg-white/35'} px-6 py-6`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-3xl border ${isDarkMode ? 'border-cyan-300/20 bg-cyan-300/10' : 'border-gray-300/20 bg-gray-300/10'}`}>
              <Bot size={22} className={isDarkMode ? 'text-cyan-200' : 'text-gray-700'} />
            </div>
            <div>
              <h2 className={`text-base font-black uppercase tracking-[0.24em] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>AI Order Assistant</h2>
              <p className={`mt-1 max-w-xl text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Inventory-aware NLP order parsing and verification workflow across your manufacturing request lifecycle.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={scrollToTop}
            className={`inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition ${isDarkMode ? 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15' : 'border-blue-300/20 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
          >
            Scroll earlier chats
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${isDarkMode ? 'text-cyan-200' : 'text-blue-600'}`}>Conversation</p>
            <h3 className={`mt-2 text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>AI Order Assistant Chat</h3>
          </div>
          <p className={`max-w-2xl text-sm leading-7 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Use natural language to request inventory-backed products, then confirm with verification codes in one smooth chat flow.</p>
        </div>

        <div className={`mt-6 h-[52vh] md:h-[56vh] overflow-hidden rounded-[32px] border ${isDarkMode ? 'border-cyan-300/20 bg-slate-950/80' : 'border-gray-200/60 bg-white/95'} shadow-[inset_0_12px_48px_rgba(15,23,42,0.14)]`}>
          <div
            ref={messagesContainerRef}
            className={`relative h-full overflow-y-auto px-5 py-5 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}
          >
          <AnimatePresence initial={false}>
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10, x: isUser ? 10 : -10 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`mb-4 flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[92%] rounded-[24px] border px-5 py-4 shadow-sm ${
                      isUser
                        ? isDarkMode
                          ? "border-slate-700 bg-slate-900 text-slate-100"
                          : "border-slate-200 bg-slate-100 text-slate-900"
                        : isDarkMode
                          ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                          : "border-blue-300/30 bg-blue-100 text-slate-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                    {message.entities ? (
                      <div className={`mt-3 rounded-2xl border p-3 ${isDarkMode ? 'border-white/10 bg-slate-950/35 text-slate-200' : 'border-gray-300/20 bg-gray-100 text-gray-700'}`}>
                        {Object.entries(message.entities).map(([key, value]) => (
                          <div key={key} className="mb-2 flex flex-col gap-2 rounded-[18px] border border-current bg-white/5 p-3 md:flex-row md:justify-between md:gap-4">
                            <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>{key}</span>
                            <span className={`text-right font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {showScrollTop ? (
            <button
              type="button"
              onClick={scrollToTop}
              className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/90 px-4 py-2 text-sm font-semibold text-white shadow-2xl transition hover:bg-slate-900"
            >
              Earlier chats
            </button>
          ) : null}
          </div>
        </div>
        {loading ? (
          <div className="mb-4 flex justify-start">
            <div className={`flex items-center gap-2 rounded-[24px] border ${isDarkMode ? 'border-cyan-300/20 bg-cyan-300/10' : 'border-blue-300/20 bg-blue-50'} px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
              <Loader2 size={14} className="animate-spin" />
              Validating inventory and parsing request...
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className={`sticky bottom-0 border-t ${isDarkMode ? 'border-cyan-300/20 bg-slate-950/70' : 'border-gray-300/20 bg-white/70'} px-4 py-4 backdrop-blur`}>
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSend(suggestion)}
              className={`rounded-full border ${isDarkMode ? 'border-cyan-300/20 hover:bg-white/10' : 'border-gray-300/20 hover:bg-gray-200/50'} px-3 py-1.5 text-[11px] font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-700'} transition`}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSend();
          }}
          className="flex gap-3"
        >
          <div className="relative flex-1">
            <ClipboardList size={14} className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Describe your manufacturing request..."
              disabled={loading}
              className={`w-full rounded-2xl border ${isDarkMode ? 'border-white/10 bg-slate-900/80 focus:border-cyan-300/40' : 'border-gray-300/20 bg-gray-100/80 focus:border-blue-300/40'} py-3 pl-10 pr-4 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'} outline-none transition`}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={`inline-flex min-w-[52px] items-center justify-center rounded-2xl ${isDarkMode ? 'bg-cyan-300 disabled:bg-white/10 disabled:text-slate-500' : 'bg-blue-500 disabled:bg-gray-300/50 disabled:text-gray-400'} px-4 py-3 font-semibold ${isDarkMode ? 'text-slate-950' : 'text-white'} transition disabled:cursor-not-allowed`}
          >
            <Send size={15} />
          </button>
        </form>

        <div className={`mt-4 rounded-[24px] border ${isDarkMode ? 'border-cyan-300/20 bg-cyan-300/10' : 'border-blue-300/20 bg-blue-50/50'} p-4`}>
          <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] ${isDarkMode ? 'text-cyan-100' : 'text-blue-700'}`}>
            <Verified size={12} />
            Verification
          </div>
          {activeDraft ? (
            <>
              <div className={`mt-3 rounded-2xl border ${isDarkMode ? 'border-white/10 bg-slate-950/45' : 'border-gray-300/20 bg-gray-100/50'} p-4 text-sm ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{activeDraft.requestId}</p>
                <p className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  {activeDraft.quantity} {activeDraft.productName} · Deadline {activeDraft.deadline}
                </p>
                <p className={`mt-2 text-xs font-bold uppercase tracking-[0.18em] ${isDarkMode ? 'text-cyan-100' : 'text-blue-600'}`}>
                  Code {activeDraft.verificationCode}
                </p>
              </div>
              {pendingDrafts.length > 1 ? (
                <select
                  value={selectedDraftId}
                  onChange={(event) => setSelectedDraftId(event.target.value)}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none"
                >
                  {pendingDrafts.map((draft) => (
                    <option key={draft.id} value={draft.id}>
                      {draft.requestId} · {draft.productName}
                    </option>
                  ))}
                </select>
              ) : null}
              <div className="mt-3 flex gap-3">
                <input
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.toUpperCase())}
                  placeholder="Enter Verification Code"
                  disabled={confirming}
                  className="flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm uppercase tracking-[0.18em] text-white outline-none"
                />
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  disabled={confirming || !verificationCode.trim()}
                  className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
                >
                  {confirming ? "Confirming..." : "Confirm Order"}
                </button>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-300">Place an inventory-valid order to generate a verification code.</p>
          )}
        </div>
      </div>
    </section>
  );
}

