import { useEffect, useRef, useState } from "react";
import { Pencil, Save, X, Loader2, Bold, Italic, List, Heading, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SectionLabel from "@/components/SectionLabel";
import useAuthStore from "@/lib/authStore";
import { pagesApi } from "@/lib/api";
import { useSEO } from "@/lib/seo";

// Inline-editable informational page. Customers see view-only content; admins
// get an Edit button that turns the body into a contentEditable surface with a
// tiny formatting toolbar. Content is stored as sanitized HTML server-side and
// falls back to `defaultHtml` (the built-in copy) when nothing is saved yet.
export default function EditablePolicyPage({ slug, num, label, title, defaultHtml, testId }) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [html, setHtml] = useState(defaultHtml);
  const [pageTitle, setPageTitle] = useState(title);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const editorRef = useRef(null);

  useSEO({ title: pageTitle });

  // Load saved content (falls back to default on 204/empty)
  useEffect(() => {
    let active = true;
    pagesApi
      .get(slug)
      .then(({ data }) => {
        if (!active || !data) return;
        if (data.html) setHtml(data.html);
        if (data.title) setPageTitle(data.title);
      })
      .catch(() => {}) // network/404 → keep defaults
      .finally(() => active && setLoaded(true));
    return () => { active = false; };
  }, [slug]);

  const startEdit = () => {
    setEditing(true);
    // Populate the editor after it mounts
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = html;
    }, 0);
  };

  const cancelEdit = () => setEditing(false);

  // Reset to the built-in default content. Loads the original copy back into
  // the editor (with proper headings/spacing) so a messy paste can be undone
  // in one click. The admin still presses Save to make it live.
  const resetToDefault = () => {
    if (!window.confirm("Reset this page to the original default content? Your current text will be replaced.")) return;
    setHtml(defaultHtml);
    if (editorRef.current) editorRef.current.innerHTML = defaultHtml;
    toast.success("Reset to default — press Save to publish");
  };

  const exec = (cmd, value = null) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  // Paste as plain text — strips font-family/size and other styling that
  // browsers and Word carry along, which was causing inconsistent fonts and
  // spacing on saved pages. The toolbar buttons add formatting deliberately.
  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const save = async () => {
    const newHtml = editorRef.current?.innerHTML || "";
    setSaving(true);
    try {
      const { data } = await pagesApi.save(slug, { html: newHtml, title: pageTitle });
      setHtml(data.html); // server returns sanitized version
      setEditing(false);
      toast.success("Page updated");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header />
      <main className="page" data-testid={testId || "policy-page"}>
        <div className="container-tight pt-12 pb-16">
          <div className="flex items-start justify-between gap-4">
            <SectionLabel num={num}>{label}</SectionLabel>
            {/* Admin-only edit affordance */}
            {isAdmin && loaded && !editing && (
              <button
                onClick={startEdit}
                className="btn-secondary text-[12px] flex items-center gap-1.5 shrink-0"
                data-testid="page-edit-btn"
              >
                <Pencil size={12} /> Edit
              </button>
            )}
            {isAdmin && editing && (
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={resetToDefault} className="btn-ghost text-[12px] flex items-center gap-1.5 text-neutral-500 hover:text-white" title="Restore original content">
                  <RotateCcw size={12} /> Reset
                </button>
                <button onClick={cancelEdit} className="btn-ghost text-[12px] flex items-center gap-1.5">
                  <X size={12} /> Cancel
                </button>
                <button onClick={save} disabled={saving} className="btn-primary text-[12px] flex items-center gap-1.5">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Save
                </button>
              </div>
            )}
          </div>

          <h1 className="display-2 display-grad mt-4 mb-8">{pageTitle}</h1>

          {editing ? (
            <div className="max-w-3xl">
              {/* Minimal formatting toolbar */}
              <div className="flex items-center gap-1 mb-3 p-1.5 rounded-lg border border-white/10 bg-white/[0.02] w-fit">
                <ToolbarBtn onClick={() => exec("bold")} title="Bold"><Bold size={14} /></ToolbarBtn>
                <ToolbarBtn onClick={() => exec("italic")} title="Italic"><Italic size={14} /></ToolbarBtn>
                <ToolbarBtn onClick={() => exec("formatBlock", "<h2>")} title="Heading"><Heading size={14} /></ToolbarBtn>
                <ToolbarBtn onClick={() => exec("insertUnorderedList")} title="Bullet list"><List size={14} /></ToolbarBtn>
                <ToolbarBtn onClick={() => exec("formatBlock", "<p>")} title="Normal text"><span className="text-[11px] px-1">¶</span></ToolbarBtn>
              </div>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onPaste={handlePaste}
                className="policy-content policy-editor min-h-[300px] max-w-3xl rounded-xl border border-white/15 bg-white/[0.02] p-5 focus:outline-none focus:border-white/30 text-neutral-300 leading-relaxed text-[14.5px]"
                data-testid="page-editor"
              />
              <p className="text-[11px] text-neutral-600 mt-2">
                Changes go live for all visitors when you save.
              </p>
            </div>
          ) : (
            <div
              className="policy-content max-w-3xl text-neutral-400 leading-relaxed text-[14.5px]"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function ToolbarBtn({ onClick, title, children }) {
  return (
    <button
      type="button"
      // onMouseDown (not onClick) so the editor doesn't lose its selection
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
    >
      {children}
    </button>
  );
}
