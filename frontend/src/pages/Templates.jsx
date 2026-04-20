import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import AppNav from "../components/AppNav";
import { api, formatApiError } from "../lib/api";

export default function Templates() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/templates");
      setItems(data);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post("/templates", { name: name.trim(), description: desc });
      setItems([data, ...items]);
      setName(""); setDesc("");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete template?")) return;
    await api.delete(`/templates/${id}`);
    setItems(items.filter((t) => t.id !== id));
  };

  const apply = async (id) => {
    try {
      const { data } = await api.post(`/templates/${id}/apply`);
      navigate(`/app/projects/${data.id}`);
    } catch (e) {
      setError(formatApiError(e));
    }
  };

  return (
    <div className="min-h-screen bg-paper" data-testid="templates-page">
      <AppNav />
      <main className="max-w-[1400px] mx-auto px-6 md:px-10 py-10 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <p className="mono-label">{"{ templates }"}</p>
          <h1 className="font-display text-5xl uppercase mt-3">
            Reuse the <span className="text-signal">thinking.</span>
          </h1>
          <p className="mt-4 text-muted">Turn a recurring project type into a reusable starting point. Same questions, pre-filled. Different project, same rigour.</p>

          <form onSubmit={create} className="card-brut p-6 mt-10 space-y-5" data-testid="template-create-form">
            <p className="mono-label">{"{ new template }"}</p>
            <div>
              <label className="mono-tag text-muted">NAME</label>
              <input className="input-line mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Landing page intake" data-testid="template-name-input" />
            </div>
            <div>
              <label className="mono-tag text-muted">DESCRIPTION</label>
              <input className="input-line mt-2" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short note — what this is for" data-testid="template-desc-input" />
            </div>
            {error && <div className="border border-danger p-3"><p className="mono-tag text-danger">ERROR</p><p className="text-sm mt-1">{error}</p></div>}
            <button type="submit" disabled={creating || !name.trim()} className="btn-brut w-full justify-center" data-testid="template-submit-btn">
              <Plus size={14} /> {creating ? "Saving…" : "Save template"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-3xl uppercase">Your templates</h2>
            <span className="mono-tag text-muted">{items.length.toString().padStart(2, "0")} TOTAL</span>
          </div>

          {loading ? (
            <p className="mono-label mt-6">LOADING…</p>
          ) : items.length === 0 ? (
            <div className="mt-6 border border-ink border-dashed p-8 bg-chalk">
              <p className="mono-tag text-muted">No templates yet. Save one from a locked project, or create a blank one on the left.</p>
            </div>
          ) : (
            <div className="mt-6 border border-ink">
              {items.map((t, i) => (
                <div key={t.id} className={`p-5 bg-chalk ${i < items.length - 1 ? "border-b border-ink" : ""} flex flex-col md:flex-row md:items-center gap-4`} data-testid={`template-row-${t.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-2xl truncate">{t.name}</p>
                    {t.description && <p className="text-sm text-muted mt-1">{t.description}</p>}
                    <p className="mono-tag text-muted mt-2">{Object.values({ s: t.situation_input, c: t.context_input, d: t.decision_input }).filter(Boolean).length}/3 SLOTS PRE-FILLED</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => apply(t.id)} className="btn-brut" data-testid={`template-apply-${t.id}`}>
                      Start from template <ArrowRight size={14} />
                    </button>
                    <button onClick={() => remove(t.id)} className="p-3 border border-ink hover:bg-danger hover:text-chalk hover:border-danger" data-testid={`template-delete-${t.id}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
