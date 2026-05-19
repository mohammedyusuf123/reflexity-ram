import { useState } from "react";
import { toast } from "sonner";
import { Bell, Check } from "lucide-react";
import { useRestockAlerts } from "@/lib/store";

export default function RestockSignup({ slug, sku }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const subscribe = useRestockAlerts((s) => s.subscribe);

  const submit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    const ok = subscribe(slug, email.trim());
    setDone(true);
    toast.success(ok ? "We'll email you when this SKU is back" : "You're already on the list", {
      description: `Restock alert · ${sku}`,
    });
  };

  if (done) {
    return (
      <div
        className="glass rounded-xl p-4 flex items-center gap-3"
        data-testid="restock-success"
      >
        <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center">
          <Check size={16} className="text-emerald-300" />
        </div>
        <div className="text-[13px] leading-tight">
          <div className="font-medium text-white">You're on the list.</div>
          <div className="text-neutral-400 text-[12px]">
            We'll email <span className="text-neutral-200">{email}</span> when this SKU is back in stock.
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="glass rounded-xl p-4"
      data-testid="restock-form"
    >
      <div className="flex items-center gap-2 mb-2">
        <Bell size={14} className="text-neutral-400" />
        <div className="text-[13px] font-medium">Email me on restock</div>
      </div>
      <p className="text-[12px] text-neutral-500 mb-3">
        Get notified the moment this SKU returns. No marketing — restock only.
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="input"
          required
          data-testid="restock-email-input"
        />
        <button type="submit" className="btn-primary" data-testid="restock-submit-btn">
          Notify me
        </button>
      </div>
    </form>
  );
}
