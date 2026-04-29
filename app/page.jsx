"use client";

import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const blankTraining = () => ({
  id: "",
  name: "Innolife - Treinamento de Boas Práticas",
  instructor: "Equipe Innolife",
  date: new Date().toISOString().slice(0, 10),
  place: "Sala de Treinamento"
});

function brDate(v) {
  if (!v) return "";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
}

function makeCode() {
  return "LI-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function Home() {
  const [page, setPage] = useState("dashboard");
  const [training, setTraining] = useState(blankTraining());
  const [namesText, setNamesText] = useState("");
  const [participants, setParticipants] = useState([]);
  const [signingIndex, setSigningIndex] = useState(null);
  const [savedInfo, setSavedInfo] = useState("Nenhuma lista carregada.");
  const [loadCode, setLoadCode] = useState("");
  const [onlineLists, setOnlineLists] = useState([]);
  const [loading, setLoading] = useState(false);

  const canvasRef = useRef(null);
  const pdfRef = useRef(null);
  const drawingRef = useRef(false);

  const signed = participants.filter((p) => p.signed).length;

  useEffect(() => {
    setupCanvas();
    fetchOnlineLists();
  }, []);

  function setupCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    const pos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches ? e.touches[0] : e;
      return {
        x: (t.clientX - rect.left) * (canvas.width / rect.width),
        y: (t.clientY - rect.top) * (canvas.height / rect.height)
      };
    };
    const start = (e) => {
      drawingRef.current = true;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      e.preventDefault();
    };
    const move = (e) => {
      if (!drawingRef.current) return;
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      e.preventDefault();
    };
    const end = () => (drawingRef.current = false);

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", end);
    canvas.addEventListener("mouseleave", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end);
  }

  function updateTraining(field, value) {
    setTraining((t) => ({ ...t, [field]: value }));
  }

  function createList() {
    const names = namesText.split(/\n+/).map((n) => n.trim()).filter(Boolean);
    if (!names.length) return alert("Digite pelo menos um nome.");
    if (participants.length && !confirm("Substituir a lista atual pelos nomes digitados?")) return;
    setParticipants(names.map((name) => ({ name, signed: false, signature: null })));
    setNamesText("");
    setPage("treinamentos");
  }

  function fillTextArea() {
    setNamesText(participants.map((p) => p.name).join("\n"));
  }

  function addName() {
    const name = prompt("Nome do participante:");
    if (!name || !name.trim()) return;
    setParticipants((p) => [...p, { name: name.trim(), signed: false, signature: null }]);
  }

  function editName(index, value) {
    setParticipants((old) => old.map((p, i) => i === index ? { ...p, name: value } : p));
  }

  function removeParticipant(index) {
    if (!confirm("Remover este participante?")) return;
    setParticipants((old) => old.filter((_, i) => i !== index));
  }

  function openSignature(index) {
    setSigningIndex(index);
    clearCanvas();
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }

  function saveSignature() {
    if (signingIndex === null) return;
    const data = canvasRef.current.toDataURL("image/png");
    setParticipants((old) => old.map((p, i) => i === signingIndex ? { ...p, signed: true, signature: data } : p));
    setSigningIndex(null);
  }

  async function saveOnline() {
    try {
      setLoading(true);
      const code = training.id || makeCode();
      const payload = {
        training: { ...training, id: code },
        participants,
        savedAt: new Date().toISOString()
      };

      const res = await fetch("/api/lists/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("A API /api/lists/save não subiu corretamente. Reenvie o ZIP corrigido no GitHub e faça Redeploy no Vercel.");
      }

      if (!res.ok) throw new Error(data.error || "Erro ao salvar.");

      setTraining((t) => ({ ...t, id: code }));
      setSavedInfo(`Lista salva online. Código: ${code}`);
      setLoadCode(code);
      fetchOnlineLists();
      alert(`Lista salva online com sucesso. Código: ${code}`);
    } catch (e) {
      alert("Erro ao salvar online: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadOnline(codeParam) {
    const code = (codeParam || loadCode || "").trim();
    if (!code) return alert("Digite o código da lista.");
    try {
      setLoading(true);
      const res = await fetch(`/api/lists/load?id=${encodeURIComponent(code)}`);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("A API /api/lists/load não subiu corretamente. Reenvie o ZIP corrigido no GitHub e faça Redeploy no Vercel.");
      }
      if (!res.ok) throw new Error(data.error || "Lista não encontrada.");

      setTraining(data.training);
      setParticipants(data.participants || []);
      setSavedInfo(`Lista carregada online. Código: ${data.training.id}`);
      setLoadCode(data.training.id);
      setPage("treinamentos");
    } catch (e) {
      alert("Erro ao carregar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOnlineLists() {
    try {
      const res = await fetch("/api/lists/all");
      const text = await res.text();
      let data = { lists: [] };
      try { data = JSON.parse(text); } catch {}
      setOnlineLists(data.lists || []);
    } catch {}
  }

  function newTraining() {
    if (!confirm("Limpar a tela e iniciar novo treinamento?")) return;
    setTraining(blankTraining());
    setParticipants([]);
    setNamesText("");
    setSavedInfo("Novo treinamento iniciado.");
  }

  function exportCSV() {
    let csv = "Nº;Participante;Status\\n";
    participants.forEach((p, i) => csv += `${i + 1};${p.name};${p.signed ? "Assinado" : "Pendente"}\\n`);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "listainno.csv";
    a.click();
  }

  async function exportPDF() {
    const canvas = await html2canvas(pdfRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const w = 210;
    const h = canvas.height * w / canvas.width;
    pdf.addImage(img, "PNG", 0, 0, w, h);
    pdf.save("listainno_presenca.pdf");
  }

  const Nav = ({ id, children }) => (
    <button className={`nav ${page === id ? "active" : ""}`} onClick={() => setPage(id)}>{children}</button>
  );

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand"><img src="/logo_inno_life.webp" alt="Innolife" /></div>
          <Nav id="dashboard">⌂ <span>Dashboard</span></Nav>
          <Nav id="treinamentos">▣ <span>Treinamentos</span></Nav>
          <Nav id="participantes">♙ <span>Participantes</span></Nav>
          <Nav id="relatorios">▤ <span>Relatórios</span></Nav>
          <Nav id="configuracoes">⚙ <span>Configurações</span></Nav>
          <div className="side-card">
            <img src="/logo_inno_life.webp" alt="Innolife" />
            <p>Transformando conhecimento em qualidade de vida.</p>
            <strong>www.innolife.com.br</strong>
          </div>
        </aside>

        <main className="content">
          <section className={`page ${page === "dashboard" ? "active" : ""}`}>
            <div className="page-head">
              <div><h1>Dashboard</h1><p>Resumo rápido da lista de presença.</p></div>
              <button className="btn primary" onClick={() => setPage("treinamentos")}>Abrir lista</button>
            </div>
            <div className="cards">
              <div className="metric"><span>Participantes</span><strong>{participants.length}</strong></div>
              <div className="metric"><span>Assinados</span><strong>{signed}</strong></div>
              <div className="metric"><span>Pendentes</span><strong>{participants.length - signed}</strong></div>
            </div>
            <div className="panel">
              <h2>Salvar e carregar online</h2>
              <p className="notice">{savedInfo}</p>
              <label>Código da lista
                <input value={loadCode} onChange={(e) => setLoadCode(e.target.value)} placeholder="Ex: LI-ABC123" />
              </label>
              <div className="row-actions">
                <button className="btn success" onClick={saveOnline} disabled={loading}>{loading ? "Salvando..." : "Salvar online"}</button>
                <button className="btn primary" onClick={() => loadOnline()} disabled={loading}>Carregar pelo código</button>
              </div>
            </div>
          </section>

          <section className={`page ${page === "treinamentos" ? "active" : ""}`}>
            <div className="page-head">
              <div><h1>Lista de Presença</h1><p>Crie a lista, salve online e colete assinatura em outro dia/aparelho.</p></div>
              <button className="btn primary" onClick={newTraining}>+ Novo treinamento</button>
            </div>

            <div className="training-grid panel">
              <label>Código<input value={training.id} onChange={(e) => updateTraining("id", e.target.value.toUpperCase())} placeholder="Gerado ao salvar" /></label>
              <label>Treinamento<input value={training.name} onChange={(e) => updateTraining("name", e.target.value)} /></label>
              <label>Instrutor<input value={training.instructor} onChange={(e) => updateTraining("instructor", e.target.value)} /></label>
              <label>Data<input type="date" value={training.date} onChange={(e) => updateTraining("date", e.target.value)} /></label>
              <label>Local<input value={training.place} onChange={(e) => updateTraining("place", e.target.value)} /></label>
            </div>

            <div className="panel">
              <div className="panel-title">
                <div><h2>Criar ou editar lista de nomes</h2><p>Digite um nome por linha. Depois clique em “Criar/Atualizar lista”.</p></div>
                <button className="btn ghost" onClick={fillTextArea}>Editar lista inteira</button>
              </div>
              <textarea value={namesText} onChange={(e) => setNamesText(e.target.value)} placeholder={"João da Silva\\nMaria Oliveira\\nCarlos Ferreira"} />
              <div className="row-actions">
                <button className="btn primary" onClick={createList}>Criar/Atualizar lista</button>
                <button className="btn ghost" onClick={addName}>+ Adicionar nome</button>
                <button className="btn success" onClick={saveOnline}>Salvar online</button>
                <button className="btn ghost" onClick={() => loadOnline()}>Carregar online</button>
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">
                <div><h2>Participantes e assinaturas</h2><p>Edite o nome na linha e clique em “Salvar online” para guardar na nuvem.</p></div>
                <div className="row-actions compact">
                  <button className="btn ghost" onClick={exportCSV}>CSV</button>
                  <button className="btn primary" onClick={exportPDF}>PDF</button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Nº</th><th>Nome</th><th>Status</th><th>Assinatura</th><th>Ações</th></tr></thead>
                  <tbody>
                    {participants.length ? participants.map((p, i) => (
                      <tr key={i}>
                        <td>{String(i + 1).padStart(2, "0")}</td>
                        <td><input className="name-edit" value={p.name} onChange={(e) => editName(i, e.target.value)} /></td>
                        <td><span className={`status ${p.signed ? "ok" : "wait"}`}>{p.signed ? "✅ Assinado" : "⏳ Pendente"}</span></td>
                        <td>{p.signature ? <img className="signature-box" src={p.signature} alt="assinatura" /> : <div className="empty-sign">Sem assinatura</div>}</td>
                        <td><button className="sign-btn" onClick={() => openSignature(i)}>{p.signed ? "Refazer" : "Assinar"}</button> <button className="delete-btn" onClick={() => removeParticipant(i)}>🗑</button></td>
                      </tr>
                    )) : <tr><td colSpan="5">Nenhum participante criado ainda.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className={`page ${page === "participantes" ? "active" : ""}`}>
            <div className="page-head"><div><h1>Participantes</h1><p>Controle geral dos nomes cadastrados.</p></div></div>
            <div className="panel table-wrap">
              <table>
                <thead><tr><th>Nº</th><th>Nome</th><th>Status</th><th>Ação</th></tr></thead>
                <tbody>
                {participants.length ? participants.map((p, i) => (
                  <tr key={i}><td>{String(i + 1).padStart(2, "0")}</td><td>{p.name}</td><td>{p.signed ? "✅ Assinado" : "⏳ Pendente"}</td><td><button className="sign-btn" onClick={() => openSignature(i)}>Assinar</button></td></tr>
                )) : <tr><td colSpan="4">Nenhum participante.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className={`page ${page === "relatorios" ? "active" : ""}`}>
            <div className="page-head"><div><h1>Relatórios</h1><p>Exporte sua lista de presença.</p></div></div>
            <div className="cards">
              <button className="metric clickable" onClick={exportPDF}><span>Gerar</span><strong>PDF</strong></button>
              <button className="metric clickable" onClick={exportCSV}><span>Gerar</span><strong>CSV</strong></button>
              <button className="metric clickable" onClick={() => window.print()}><span>Enviar</span><strong>Impressão</strong></button>
            </div>
          </section>

          <section className={`page ${page === "configuracoes" ? "active" : ""}`}>
            <div className="page-head"><div><h1>Configurações</h1><p>Vercel Blob precisa estar ativo no projeto.</p></div></div>
            <div className="panel">
              <h2>Listas salvas online</h2>
              <p>Use o código para abrir uma lista em outro aparelho.</p>
              <div className="row-actions"><button className="btn ghost" onClick={fetchOnlineLists}>Atualizar</button></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Código</th><th>Treinamento</th><th>Salvo em</th><th>Ação</th></tr></thead>
                  <tbody>
                  {onlineLists.length ? onlineLists.map((l) => (
                    <tr key={l.id}><td>{l.id}</td><td>{l.name}</td><td>{l.savedAt ? new Date(l.savedAt).toLocaleString("pt-BR") : "-"}</td><td><button className="sign-btn" onClick={() => loadOnline(l.id)}>Abrir</button></td></tr>
                  )) : <tr><td colSpan="4">Nenhuma lista encontrada.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>

        <aside className="preview">
          <div className="preview-bar"><strong>Pré-visualização do PDF</strong><button onClick={exportPDF}>↓ PDF</button></div>
          <div ref={pdfRef} className="paper">
            <div className="pdf-head"><img src="/logo_inno_life.webp" alt="Innolife" /><h2>LISTA DE PRESENÇA</h2></div>
            <div className="pdf-info">
              <div><b>Treinamento:</b><span>{training.name}</span></div>
              <div><b>Data:</b><span>{brDate(training.date)}</span></div>
              <div><b>Instrutor:</b><span>{training.instructor}</span></div>
              <div><b>Local:</b><span>{training.place}</span></div>
            </div>
            <table className="pdf-table">
              <thead><tr><th>Nº</th><th>Participante</th><th>Assinatura</th></tr></thead>
              <tbody>
                {participants.length ? participants.map((p, i) => (
                  <tr key={i}><td>{String(i + 1).padStart(2, "0")}</td><td>{p.name}</td><td>{p.signature ? <img className="pdf-sig" src={p.signature} alt="assinatura" /> : <span className="pdf-pending">Pendente</span>}</td></tr>
                )) : <tr><td colSpan="3">Nenhum participante.</td></tr>}
              </tbody>
            </table>
            <div className="pdf-footer"><img src="/logo_inno_life.webp" alt="Innolife" /><span>Transformando conhecimento em qualidade de vida.</span><b>www.innolife.com.br</b></div>
          </div>
        </aside>
      </div>

      <div className={`modal ${signingIndex !== null ? "show" : ""}`}>
        <div className="modal-card">
          <div className="modal-head">
            <div><h2>Coletar assinatura</h2><p>{signingIndex !== null ? participants[signingIndex]?.name : ""}</p></div>
            <button className="icon-btn" onClick={() => setSigningIndex(null)}>×</button>
          </div>
          <canvas ref={canvasRef} width="900" height="260"></canvas>
          <div className="row-actions end">
            <button className="btn ghost dark-text" onClick={clearCanvas}>Limpar</button>
            <button className="btn ghost dark-text" onClick={() => setSigningIndex(null)}>Cancelar</button>
            <button className="btn primary" onClick={saveSignature}>Salvar assinatura</button>
          </div>
        </div>
      </div>
    </>
  );
}
