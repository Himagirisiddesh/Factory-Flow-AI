import React, { useEffect, useState } from "react";
import { ClipboardCheck, RefreshCcw } from "lucide-react";
import api from "../api";
import OrderCard from "./OrderCard";
import WorkspaceHeader from "./WorkspaceHeader";

export default function AdminDashboard({ user, onLogout, onSessionExpired, onToast }) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [decisionByOrder, setDecisionByOrder] = useState({});
  const [noteByOrder, setNoteByOrder] = useState({});
  const [statusByOrder, setStatusByOrder] = useState({});
  const [submittingOrderId, setSubmittingOrderId] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        const { data } = await api.get("/orders");
        if (active) setOrders(data.orders || []);
      } catch (requestError) {
        if (requestError.response?.status === 401 && active) onSessionExpired?.();
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrders();
    const intervalId = window.setInterval(loadOrders, 4000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [onSessionExpired, refreshTick]);

  useEffect(() => {
    const stream = new EventSource("/api/orders/stream", { withCredentials: true });
    stream.addEventListener("order_requested", () => setRefreshTick((value) => value + 1));
    stream.addEventListener("order_status_changed", () => setRefreshTick((value) => value + 1));
    stream.onerror = () => {};
    return () => stream.close();
  }, []);

  const handleDecision = async (orderId) => {
    const decision = decisionByOrder[orderId] || "accept";
    const note = noteByOrder[orderId] || "";
    const status = statusByOrder[orderId] || "";
    setSubmittingOrderId(orderId);

    try {
      const { data } = await api.post(`/admin/orders/${orderId}/decision`, {
        decision,
        note,
        status,
      });
      onToast?.(data.reply || `Order ${orderId} updated.`, "success");
      setRefreshTick((value) => value + 1);
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        onSessionExpired?.();
        return;
      }
      onToast?.(requestError.response?.data?.error || "Unable to update order.", "error");
    } finally {
      setSubmittingOrderId("");
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.12),_transparent_35%),linear-gradient(180deg,_#090f1f_0%,_#111827_100%)] text-white' : 'bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 text-slate-900'}`}>
      <WorkspaceHeader
        user={user}
        portalName="Admin Portal"
        portalHint="Review customer requests and update decisions"
        accentClassName="border-violet-300/30 bg-violet-300/10 text-violet-100"
        onLogout={onLogout}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((value) => !value)}
      />
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
        <section className={`rounded-[28px] border p-5 ${isDarkMode ? 'border-white/10 bg-white/5 text-white' : 'border-slate-200/20 bg-white/90 text-slate-900'}`}>
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-violet-200" />
            <h2 className="text-lg font-black">Incoming Order Requests</h2>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            Accept, reject, or set a custom status update. Your decision is immediately visible in the customer portal.
          </p>
        </section>

        {loading ? (
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-8 text-sm text-slate-300">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-8 text-sm text-slate-300">
            No order requests available.
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            {orders.map((order) => (
              <div key={order.orderId} className={`space-y-4 rounded-[28px] border p-4 ${isDarkMode ? 'border-white/10 bg-slate-950/30 text-white' : 'border-slate-200/20 bg-white/90 text-slate-900'}`}>
                <OrderCard order={order} />
                <div className="space-y-3">
                  <select
                    value={decisionByOrder[order.orderId] || "accept"}
                    onChange={(event) =>
                      setDecisionByOrder((state) => ({ ...state, [order.orderId]: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="accept">Accept</option>
                    <option value="reject">Reject</option>
                    <option value="update">Update Status</option>
                  </select>

                  {(decisionByOrder[order.orderId] || "accept") === "update" ? (
                    <input
                      value={statusByOrder[order.orderId] || ""}
                      onChange={(event) =>
                        setStatusByOrder((state) => ({ ...state, [order.orderId]: event.target.value }))
                      }
                      placeholder="Custom status (e.g. In Review, Production)"
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none"
                    />
                  ) : null}

                  <textarea
                    value={noteByOrder[order.orderId] || ""}
                    onChange={(event) => setNoteByOrder((state) => ({ ...state, [order.orderId]: event.target.value }))}
                    placeholder="Optional note for customer"
                    className="min-h-20 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleDecision(order.orderId)}
                    disabled={submittingOrderId === order.orderId}
                    className="inline-flex items-center gap-2 rounded-2xl bg-violet-300 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-70"
                  >
                    <RefreshCcw size={14} />
                    {submittingOrderId === order.orderId ? "Updating..." : "Submit Decision"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
