let participants = [];
let signingIndex = null;

const $ = (id) => document.getElementById(id);
const today = new Date().toISOString().slice(0,10);
$("trainingDate").value = today;

document.querySelectorAll(".nav").forEach(btn => btn.addEventListener("click", () => openPage(btn.dataset.page, btn)));
document.querySelectorAll("[data-open]").forEach(btn => btn.addEventListener("click", () => openPage(btn.dataset.open, document.querySelector(`.nav[data-page="${btn.dataset.open}"]`))));

function openPage(id, btn){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  $(id).classList.add("active");
  document.querySelectorAll(".nav").forEach(n=>n.classList.remove("active"));
  if(btn) btn.classList.add("active");
}

function makeCode(){ return "LI-" + Math.random().toString(36).slice(2,8).toUpperCase(); }
function brDate(v){ if(!v) return ""; const [y,m,d]=v.split("-"); return `${d}/${m}/${y}`; }
function trainingData(){
  return {
    id: $("trainingId").value.trim().toUpperCase(),
    name: $("trainingName").value.trim(),
    instructor: $("instructorName").value.trim(),
    date: $("trainingDate").value,
    place: $("trainingPlace").value.trim()
  };
}
function applyTraining(t){
  $("trainingId").value = t.id || "";
  $("trainingName").value = t.name || "";
  $("instructorName").value = t.instructor || "";
  $("trainingDate").value = t.date || today;
  $("trainingPlace").value = t.place || "";
}
["trainingId","trainingName","instructorName","trainingDate","trainingPlace"].forEach(id => $(id).addEventListener("input", render));

$("createList").onclick = () => {
  const names = $("namesBox").value.split(/\n+/).map(n=>n.trim()).filter(Boolean);
  if(!names.length) return alert("Digite pelo menos um nome.");
  if(participants.length && !confirm("Substituir a lista atual pelos nomes digitados?")) return;
  participants = names.map(name => ({name, signed:false, signature:null}));
  $("namesBox").value = "";
  render();
};
$("fillTextarea").onclick = () => $("namesBox").value = participants.map(p=>p.name).join("\n");
$("addName").onclick = () => {
  const name = prompt("Nome do participante:");
  if(!name || !name.trim()) return;
  participants.push({name:name.trim(), signed:false, signature:null});
  render();
};
$("newTraining").onclick = () => {
  if(!confirm("Limpar a tela e iniciar novo treinamento?")) return;
  participants = [];
  applyTraining({id:"", name:"Innolife - Novo Treinamento", instructor:"Equipe Innolife", date:today, place:"Sala de Treinamento"});
  $("namesBox").value = "";
  render();
};

async function apiJson(url, options){
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`A rota ${url} não retornou JSON. Verifique se você subiu este ZIP novo e fez Redeploy.`); }
  if(!res.ok) throw new Error(data.error || "Erro na API.");
  return data;
}

async function saveOnline(){
  try{
    const t = trainingData();
    const id = t.id || makeCode();
    t.id = id;
    const payload = {training:t, participants, savedAt:new Date().toISOString()};
    const data = await apiJson("/api/lists/save", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
    $("trainingId").value = data.id;
    $("loadCode").value = data.id;
    $("savedInfo").innerText = `Lista salva online. Código: ${data.id}`;
    await loadOnlineLists();
    alert(`Lista salva online com sucesso. Código: ${data.id}`);
  }catch(e){
    alert("Erro ao salvar online: " + e.message);
  }
}
async function loadOnline(codeParam){
  const code = (codeParam || $("loadCode").value || $("trainingId").value || "").trim().toUpperCase();
  if(!code) return alert("Digite o código da lista.");
  try{
    const data = await apiJson(`/api/lists/load?id=${encodeURIComponent(code)}`);
    applyTraining(data.training);
    participants = Array.isArray(data.participants) ? data.participants : [];
    $("savedInfo").innerText = `Lista carregada online. Código: ${data.training.id}`;
    openPage("treinamentos", document.querySelector('.nav[data-page="treinamentos"]'));
    render();
  }catch(e){
    alert("Erro ao carregar online: " + e.message);
  }
}
async function loadOnlineLists(){
  try{
    const data = await apiJson("/api/lists/all");
    const rows = (data.lists || []).map(l => `<tr><td>${l.id}</td><td>${l.name}</td><td>${l.savedAt ? new Date(l.savedAt).toLocaleString("pt-BR") : "-"}</td><td><button class="sign-btn" onclick="loadOnline('${l.id}')">Abrir</button></td></tr>`).join("");
    $("onlineLists").innerHTML = rows || `<tr><td colspan="4">Nenhuma lista encontrada.</td></tr>`;
  }catch{
    $("onlineLists").innerHTML = `<tr><td colspan="4">Não foi possível listar agora.</td></tr>`;
  }
}
$("saveOnline1").onclick = saveOnline;
$("saveOnline2").onclick = saveOnline;
$("loadOnline1").onclick = () => loadOnline();
$("loadOnline2").onclick = () => loadOnline();
$("refreshLists").onclick = loadOnlineLists;

function editName(i, value){ participants[i].name = value; render(false); }
function removeParticipant(i){ if(confirm("Remover este participante?")){ participants.splice(i,1); render(); } }
function openSignature(i){
  signingIndex = i;
  $("signName").innerText = participants[i].name;
  clearCanvas();
  $("signModal").classList.add("show");
}
window.editName = editName;
window.removeParticipant = removeParticipant;
window.openSignature = openSignature;
window.loadOnline = loadOnline;

$("closeModal").onclick = closeModal;
$("cancelSignature").onclick = closeModal;
$("clearSignature").onclick = clearCanvas;
$("saveSignature").onclick = () => {
  if(signingIndex === null) return;
  participants[signingIndex].signature = $("signatureCanvas").toDataURL("image/png");
  participants[signingIndex].signed = true;
  closeModal();
  render();
};
function closeModal(){ $("signModal").classList.remove("show"); signingIndex = null; }

const canvas = $("signatureCanvas");
const ctx = canvas.getContext("2d");
ctx.strokeStyle = "#111"; ctx.lineWidth = 3; ctx.lineCap = "round";
let drawing = false;
function pos(e){
  const r = canvas.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return {x:(t.clientX-r.left)*(canvas.width/r.width), y:(t.clientY-r.top)*(canvas.height/r.height)};
}
function start(e){ drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); e.preventDefault(); }
function move(e){ if(!drawing) return; const p = pos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); e.preventDefault(); }
function end(){ drawing = false; }
canvas.addEventListener("mousedown", start);
canvas.addEventListener("mousemove", move);
canvas.addEventListener("mouseup", end);
canvas.addEventListener("mouseleave", end);
canvas.addEventListener("touchstart", start, {passive:false});
canvas.addEventListener("touchmove", move, {passive:false});
canvas.addEventListener("touchend", end);
function clearCanvas(){ ctx.clearRect(0,0,canvas.width,canvas.height); }

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
function render(){
  const t = trainingData();
  const signed = participants.filter(p=>p.signed).length;
  $("mTotal").innerText = participants.length;
  $("mSigned").innerText = signed;
  $("mPending").innerText = participants.length - signed;
  $("pTraining").innerText = t.name;
  $("pDate").innerText = brDate(t.date);
  $("pInstructor").innerText = t.instructor;
  $("pPlace").innerText = t.place;

  $("participantsTable").innerHTML = participants.length ? participants.map((p,i)=>`
    <tr>
      <td>${String(i+1).padStart(2,"0")}</td>
      <td><input class="name-edit" value="${escapeHtml(p.name)}" oninput="editName(${i}, this.value)"></td>
      <td><span class="status ${p.signed ? "ok" : "wait"}">${p.signed ? "✅ Assinado" : "⏳ Pendente"}</span></td>
      <td>${p.signature ? `<img class="signature-box" src="${p.signature}">` : `<div class="empty-sign">Sem assinatura</div>`}</td>
      <td><button class="sign-btn" onclick="openSignature(${i})">${p.signed ? "Refazer" : "Assinar"}</button> <button class="delete-btn" onclick="removeParticipant(${i})">🗑</button></td>
    </tr>`).join("") : `<tr><td colspan="5">Nenhum participante criado ainda.</td></tr>`;

  $("simpleParticipants").innerHTML = participants.length ? participants.map((p,i)=>`<tr><td>${String(i+1).padStart(2,"0")}</td><td>${escapeHtml(p.name)}</td><td>${p.signed ? "✅ Assinado" : "⏳ Pendente"}</td><td><button class="sign-btn" onclick="openSignature(${i})">Assinar</button></td></tr>`).join("") : `<tr><td colspan="4">Nenhum participante.</td></tr>`;

  $("pdfRows").innerHTML = participants.length ? participants.map((p,i)=>`<tr><td>${String(i+1).padStart(2,"0")}</td><td>${escapeHtml(p.name)}</td><td>${p.signature ? `<img class="pdf-sig" src="${p.signature}">` : `<span class="pdf-pending">Pendente</span>`}</td></tr>`).join("") : `<tr><td colspan="3">Nenhum participante.</td></tr>`;
}

function exportCSV(){
  let csv = "Nº;Participante;Status\n";
  participants.forEach((p,i)=> csv += `${i+1};${p.name};${p.signed ? "Assinado" : "Pendente"}\n`);
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "listainno.csv";
  a.click();
}
async function exportPDF(){
  const canvasPDF = await html2canvas($("pdfArea"), {scale:2, backgroundColor:"#ffffff", useCORS:true});
  const img = canvasPDF.toDataURL("image/png");
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p","mm","a4");
  const w = 210;
  const h = canvasPDF.height * w / canvasPDF.width;
  pdf.addImage(img, "PNG", 0, 0, w, h);
  pdf.save("listainno_presenca.pdf");
}
$("csvBtn").onclick = exportCSV;
$("csvBtn2").onclick = exportCSV;
$("pdfBtn").onclick = exportPDF;
$("pdfBtn2").onclick = exportPDF;
$("pdfBtn3").onclick = exportPDF;

render();
loadOnlineLists();
