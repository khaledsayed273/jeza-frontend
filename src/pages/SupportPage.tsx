import { api } from "@/lib/api";
import { useLocation } from "wouter";
import { useLang } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../_core/hooks/useAuth";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SupportPage() {
  const [, navigate] = useLocation();
  const { t, dir } = useLang();

  const { user, loading } = useAuth();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("technical");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);

  const { data: tickets, refetch: refetchTickets } = api.tickets.myTickets.useQuery(undefined, { enabled: !!user });
  const { data: ticketDetail, refetch: refetchDetail } = api.tickets.getTicket.useQuery(
    { ticketId: selectedTicket! }, { enabled: !!selectedTicket },
  );
  const [newMsg, setNewMsg] = useState("");

  const createTicket = api.tickets.create.useMutation({
    onSuccess: () => { refetchTickets(); setSubject(""); setMessage(""); toast.success(t("تم إنشاء التذكرة", "Ticket created")); },
    onError: (e) => toast.error(e.message),
  });

  const addMsg = api.tickets.addMessage.useMutation({
    onSuccess: () => { refetchDetail(); refetchTickets(); setNewMsg(""); },
    onError: (e) => toast.error(e.message),
  });

  const inputStyle = { background: "var(--input)", border: `1.5px solid ${"var(--border)"}`, color: "var(--foreground)", borderRadius: "0.75rem", padding: "0.65rem 1rem", fontSize: "0.9rem", fontFamily: "'Cairo', sans-serif", width: "100%", outline: "none" };

  if (!user) {
    return (
      <div dir={dir} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", fontFamily: "'Cairo', sans-serif" }} className="flex items-center justify-center px-4">
        <div className="text-center"><p className="mb-4">{t("سجل الدخول لإنشاء تذكرة دعم", "Login to create a support ticket")}</p>
          <button onClick={() => navigate("/login")} style={{ background: "var(--primary)", color: "white", padding: "0.7rem 1.5rem", borderRadius: "0.75rem", fontWeight: 700, border: "none", fontFamily: "'Cairo', sans-serif" }}>{t("تسجيل الدخول", "Login")}</button>
        </div>
      </div>
    );
  }

  const statusColor = (s: string) => s === "open" ? "var(--success)" : s === "in_progress" ? "var(--accent)" : s === "resolved" ? "var(--primary)" : "var(--muted-foreground)";

  if (selectedTicket && ticketDetail) {
    return (
      <div dir={dir} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", fontFamily: "'Cairo', sans-serif", padding: "2rem 1rem" }}>
        <div className="max-w-lg mx-auto">
          <button onClick={() => { setSelectedTicket(null); setNewMsg(""); }} style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", marginBottom: "1rem", background: "none", border: "none", fontFamily: "'Cairo', sans-serif" }}>
            ← {t("العودة للتذاكر", "Back to tickets")}
          </button>
          <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "1rem", padding: "1.5rem", marginBottom: "1rem" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black">{ticketDetail.ticket.subject}</h2>
              <span style={{ background: statusColor(ticketDetail.ticket.status) + "20", color: statusColor(ticketDetail.ticket.status), padding: "0.2rem 0.6rem", borderRadius: "0.5rem", fontSize: "0.8rem", fontWeight: 700 }}>{ticketDetail.ticket.status}</span>
            </div>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{ticketDetail.ticket.category} · {ticketDetail.ticket.priority}</p>
          </div>

          <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "1rem", padding: "1.5rem", marginBottom: "1rem" }}>
            <h3 className="font-bold text-sm mb-3">{t("الرسائل", "Messages")}</h3>
            {ticketDetail.messages.length === 0 ? (
              <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>{t("لا توجد رسائل بعد", "No messages yet")}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {ticketDetail.messages.map((m: any) => (
                  <div key={m.id} style={{ background: "var(--input)", borderRadius: "0.75rem", padding: "0.75rem" }}>
                    <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>{m.userId === user.id ? t("أنت", "You") : t("الدعم", "Support")}</p>
                    <p className="text-sm">{m.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {ticketDetail.ticket.status !== "closed" && ticketDetail.ticket.status !== "resolved" && (
            <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "1rem", padding: "1.5rem" }}>
              <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder={t("اكتب ردك...", "Write your reply...")} rows={3} style={{ ...inputStyle, resize: "vertical", marginBottom: "0.75rem" }} />
              <motion.button onClick={() => addMsg.mutate({ ticketId: selectedTicket!, message: newMsg })} disabled={addMsg.isPending || !newMsg}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{ background: "var(--primary)", color: "white", padding: "0.6rem 1.5rem", borderRadius: "0.75rem", fontWeight: 700, fontSize: "0.9rem", border: "none", fontFamily: "'Cairo', sans-serif" }}>
                {t("إرسال", "Send")}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", fontFamily: "'Cairo', sans-serif", padding: "2rem 1rem" }}>
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate("/")} style={{ color: "var(--muted-foreground)", fontSize: "0.85rem", marginBottom: "1rem", background: "none", border: "none", fontFamily: "'Cairo', sans-serif" }}>← {t("العودة للرئيسية", "Back to Home")}</button>

        <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "1rem", padding: "1.5rem", marginBottom: "2rem" }}>
          <h1 className="text-xl font-black mb-4">{t("إنشاء تذكرة دعم", "Create Support Ticket")}</h1>
          <div className="flex flex-col gap-3">
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t("الموضوع", "Subject")} style={inputStyle} />
            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
              <option value="technical">{t("مشكلة تقنية", "Technical Issue")}</option>
              <option value="billing">{t("فواتير", "Billing")}</option>
              <option value="account">{t("الحساب", "Account")}</option>
              <option value="feature">{t("طلب ميزة", "Feature Request")}</option>
              <option value="other">{t("أخرى", "Other")}</option>
            </select>
            <select value={priority} onChange={e => setPriority(e.target.value as any)} style={inputStyle}>
              <option value="low">{t("منخفضة", "Low")}</option>
              <option value="medium">{t("متوسطة", "Medium")}</option>
              <option value="high">{t("عالية", "High")}</option>
            </select>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={t("رسالتك...", "Your message...")} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            <motion.button onClick={() => createTicket.mutate({ subject, category, priority, message })} disabled={createTicket.isPending || !subject || !message}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              style={{ background: "var(--primary)", color: "white", padding: "0.7rem 0", borderRadius: "0.75rem", fontWeight: 800, fontSize: "0.9rem", border: "none", fontFamily: "'Cairo', sans-serif" }}>
              {t("إنشاء التذكرة", "Create Ticket")}
            </motion.button>
          </div>
        </div>

        <div style={{ background: "var(--card)", border: `1px solid ${"var(--border)"}`, borderRadius: "1rem", padding: "1.5rem" }}>
          <h2 className="text-lg font-black mb-4">{t("تذاكري", "My Tickets")}</h2>
          {!tickets || tickets.length === 0 ? (
            <p style={{ color: "var(--muted-foreground)" }}>{t("لا توجد تذاكر بعد", "No tickets yet")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {tickets.map((t: any) => (
                <button key={t.id} onClick={() => setSelectedTicket(t.id)}
                  style={{ background: "var(--input)", border: `1px solid ${"var(--border)"}`, borderRadius: "0.75rem", padding: "0.75rem", textAlign: dir === "rtl" ? "right" : "left", fontFamily: "'Cairo', sans-serif", cursor: "pointer" }}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{t.subject}</span>
                    <span style={{ background: statusColor(t.status) + "20", color: statusColor(t.status), padding: "0.15rem 0.5rem", borderRadius: "0.4rem", fontSize: "0.75rem", fontWeight: 700 }}>{t.status}</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{t.category}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
