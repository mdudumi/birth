// === app.js ===

// --- Supabase Config ---
const SUPABASE_URL = "https://lorhzjmcismjqpmbulkl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxvcmh6am1jaXNtanFwbWJ1bGtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5MjEyNzksImV4cCI6MjA3NjQ5NzI3OX0.rGP_xMsAbzIfO7cXdRLHeKEU_ioSE7VpmhQTWVwKilY";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Global State ---
let currentUser = null;
let isAdmin = false;
let activeTab = "freelancers";
let selectedReceiverId = null;
let selectedReceiverName = null;

// --- DOM Elements ---
const addBtn = document.getElementById("addBtn");
const navFreelancers = document.getElementById("navFreelancers");
const navProjects = document.getElementById("navProjects");
const navInbox = document.getElementById("navInbox");
const freelancersSection = document.getElementById("freelancersSection");
const projectsSection = document.getElementById("projectsSection");
const inboxSection = document.getElementById("inboxSection");
const editorPanel = document.getElementById("editorPanel");
const panelTitle = document.getElementById("panelTitle");
const contentTitle = document.getElementById("contentTitle");
const freelancerForm = document.getElementById("frmFreelancer");
const projectForm = document.getElementById("frmProject");
const toastStack = document.getElementById("toastStack");
const blurTarget = document.querySelector(".content");

const photoInput = document.getElementById("photoInput");
const photoPreview = document.getElementById("photoPreview");



async function init() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  currentUser = user || null;

  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  if (user?.email === "admin@birth.com" || user?.email === "martin.dudumi@gmail.com") {
    isAdmin = true;
  }

  if (!isAdmin) addBtn.style.display = "none";

  await loadFreelancers();
  await loadFreelancerOptions();
  await refreshInbox();
  showUnreadBadge();
}

// === Tab Switching ===
function switchTab(tab) {
  activeTab = tab;
  navFreelancers.classList.toggle("active", tab === "freelancers");
  navProjects.classList.toggle("active", tab === "projects");
  navInbox.classList.toggle("active", tab === "inbox");

  freelancersSection.classList.toggle("hidden", tab !== "freelancers");
  projectsSection.classList.toggle("hidden", tab !== "projects");
  inboxSection.classList.toggle("hidden", tab !== "inbox");

  freelancerForm.classList.toggle("hidden", tab !== "freelancers");
  projectForm.classList.toggle("hidden", tab !== "projects");

  if (tab === "projects") {
    contentTitle.textContent = "💼 Projects";
    addBtn.textContent = "+ Add Project";
    loadProjects();
  } else if (tab === "freelancers") {
    contentTitle.textContent = "👥 Freelancers";
    addBtn.textContent = isAdmin ? "+ Add Freelancer" : "";
  } else if (tab === "inbox") {
    contentTitle.textContent = "📥 Inbox";
    addBtn.textContent = "";
    refreshInbox();
  }
}
navFreelancers.onclick = () => switchTab("freelancers");
navProjects.onclick = () => switchTab("projects");
navInbox.onclick = () => switchTab("inbox");

// === Panel Control ===
addBtn.onclick = () => {
  if (activeTab === "freelancers") {
    if (!isAdmin) return showToast("Only admins can add freelancers", "error");
    openPanel("Add Freelancer");
  } else if (activeTab === "projects") {
    openPanel("Add Project");
  }
};

document.getElementById("closePanelBtn").onclick = closePanel;
document.getElementById("cancelBtn").onclick = closePanel;
document.getElementById("cancelProjBtn").onclick = closePanel;

function openPanel(title) {
  panelTitle.textContent = title;
  editorPanel.classList.add("open");
  blurTarget.style.filter = "blur(5px)";
}
function closePanel() {
  editorPanel.classList.remove("open");
  blurTarget.style.filter = "none";
  freelancerForm.reset();
  projectForm.reset();
  delete freelancerForm.dataset.id;
  delete projectForm.dataset.id;
  if (photoPreview) photoPreview.src = "assets/default-avatar.png";
}

// === Helpers ===
function showToast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  toastStack.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function normalizeSkillsForDB(value) {
  if (!value) return null;
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

// === Photo Preview ===
if (photoInput && photoPreview) {
  photoInput.addEventListener("change", () => {
    const file = photoInput.files?.[0];
    if (file) photoPreview.src = URL.createObjectURL(file);
  });
}

async function uploadFreelancerPhoto(file, freelancerId) {
  if (!file) return null;
  const ext = file.name.split(".").pop();
  const filePath = `${freelancerId || Date.now()}.${ext}`;
  const { error } = await supabaseClient.storage
    .from("freelancer-photos")
    .upload(filePath, file, { upsert: true });
  if (error) {
    console.error(error);
    showToast("❌ Error uploading photo", "error");
    return null;
  }
  const { data } = supabaseClient.storage.from("freelancer-photos").getPublicUrl(filePath);
  return data.publicUrl;
}

// === FREELANCERS ===
async function loadFreelancers() {
  const tbody = document.querySelector("#tblFree tbody");
  const { data, error } = await supabaseClient.from("freelancers").select("*");
  if (error) {
    showToast("Error loading freelancers", "error");
    return;
  }
  tbody.innerHTML = "";
  data.forEach((f) => {
    const editable = f.user_id === currentUser.id || isAdmin;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${f.photo_url || "assets/default-avatar.png"}" class="avatar"></td>
      <td>${f.display_name}</td>
      <td>${f.title || "-"}</td>
      <td>${f.location || "-"}</td>
      <td>${f.hourly_rate ?? "-"}</td>
      <td>${Array.isArray(f.skills) ? f.skills.join(", ") : (f.skills || "-")}</td>
      <td>
        <button class="btn small" onclick="viewFreelancer('${f.id}')">👁️</button>
        <button class="btn small" onclick="messageFreelancer('${f.id}','${f.display_name}','${f.user_id}')">💬</button>
        ${editable ? `<button class="btn small" onclick="editFreelancer('${f.id}')">✏️</button>` : ""}
        ${isAdmin ? `<button class="btn small" onclick="deleteFreelancer('${f.id}')">🗑️</button>` : ""}
      </td>`;
    tbody.appendChild(tr);
  });
}

// === View Freelancer ===
const viewPanel = document.getElementById("viewPanel");
const closeViewPanelBtn = document.getElementById("closeViewPanelBtn");
const msgBtnView = document.getElementById("msgBtnView");

closeViewPanelBtn.onclick = () => {
  viewPanel.classList.remove("open");
  blurTarget.style.filter = "none";
};

window.viewFreelancer = async (id) => {
  const { data, error } = await supabaseClient.from("freelancers").select("*").eq("id", id).single();
  if (error) return showToast(error.message, "error");
  document.getElementById("detailPhoto").src = data.photo_url || "assets/default-avatar.png";
  document.getElementById("detailName").textContent = data.display_name;
  document.getElementById("detailTitle").textContent = data.title || "-";
  document.getElementById("detailLocation").textContent = data.location || "-";
  document.getElementById("detailRate").textContent = data.hourly_rate ?? "-";
  document.getElementById("detailSkills").textContent =
    Array.isArray(data.skills) ? data.skills.join(", ") : (data.skills || "-");
  document.getElementById("detailLanguages").textContent = data.languages || "-";
  document.getElementById("detailBio").textContent = data.bio || "-";

  const links = [];
  if (data.website) links.push(`<a href="${data.website}" target="_blank">🌐 Website</a>`);
  if (data.linkedin) links.push(`<a href="${data.linkedin}" target="_blank">💼 LinkedIn</a>`);
  if (data.github) links.push(`<a href="${data.github}" target="_blank">💻 GitHub</a>`);
  document.getElementById("detailLinks").innerHTML = links.join("<br>");

  msgBtnView.onclick = () => messageFreelancer(id, data.display_name, data.user_id);
  viewPanel.classList.add("open");
  blurTarget.style.filter = "blur(5px)";
};

// === Edit Freelancer ===
window.editFreelancer = async function (id) {
  const { data, error } = await supabaseClient
    .from("freelancers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    showToast("❌ Error loading freelancer", "error");
    return;
  }

  // Fill form with existing data
  const fields = [
    "display_name",
    "title",
    "location",
    "hourly_rate",
    "bio",
    "skills",
    "languages",
    "website",
    "linkedin",
    "github"
  ];

  fields.forEach((key) => {
    const el = freelancerForm.elements[key];
    if (!el) return;
    if (key === "skills") {
      el.value = Array.isArray(data.skills)
        ? data.skills.join(", ")
        : data.skills || "";
    } else {
      el.value = data[key] ?? "";
    }
  });

  if (photoPreview)
    photoPreview.src = data.photo_url || "assets/default-avatar.png";

  freelancerForm.dataset.id = id;
  if (activeTab !== "freelancers") switchTab("freelancers");
  openPanel("Edit Freelancer");
};

// === Delete Freelancer ===
window.deleteFreelancer = async function (id) {
  if (!confirm("Are you sure you want to delete this freelancer?")) return;

  const { error } = await supabaseClient
    .from("freelancers")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    showToast("❌ Error deleting freelancer", "error");
    return;
  }

  showToast("🗑️ Freelancer deleted successfully", "success");
  await loadFreelancers();
};



// === Message System ===
const messageModal = document.getElementById("messageModal");
const msgReceiverName = document.getElementById("msgReceiverName");
const chatThread = document.getElementById("chatThread");
const msgContent = document.getElementById("msgContent");
const sendMsgBtn = document.getElementById("sendMsgBtn");
const cancelMsgBtn = document.getElementById("cancelMsgBtn");
const msgFileInput = document.getElementById("msgFileInput");

window.messageFreelancer = function (id, name, userId) {
  selectedReceiverId = userId;
  selectedReceiverName = name;
  msgReceiverName.textContent = name;
  loadChatThread(userId);
  messageModal.classList.remove("hidden");
  blurTarget.style.filter = "blur(5px)";
};

cancelMsgBtn.onclick = () => {
  messageModal.classList.add("hidden");
  blurTarget.style.filter = "none";
  msgContent.value = "";
  chatThread.innerHTML = "";
};

// === Emoji Picker ===
const emojiBtn = document.getElementById("emojiBtn");
const emojiPicker = document.getElementById("emojiPicker");

emojiBtn.onclick = (e) => {
  e.stopPropagation();
  emojiPicker.classList.toggle("hidden");
};

// Add emoji click behavior
emojiPicker.querySelectorAll("span").forEach(span => {
  span.addEventListener("click", () => {
    msgContent.value += span.textContent;
    emojiPicker.classList.add("hidden");
  });
});

// Hide picker when clicking outside
document.addEventListener("click", (e) => {
  if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
    emojiPicker.classList.add("hidden");
  }
});


sendMsgBtn.onclick = async () => {
  const text = msgContent.value.trim();
  const file = msgFileInput.files?.[0] || null;
  if (!text && !file) return;

  let file_url = null;
  if (file) {
    const ext = file.name.split(".").pop();
    const path = `${currentUser.id}/${Date.now()}.${ext}`;
    const { error, data } = await supabaseClient.storage.from("chat-files").upload(path, file, { upsert: true });
    if (error) return showToast("Error uploading file", "error");
    file_url = supabaseClient.storage.from("chat-files").getPublicUrl(path).data.publicUrl;
  }

const { error } = await supabaseClient.from("messages").insert({
  sender_id: currentUser.id,
  sender_email: currentUser.email,
  receiver_id: selectedReceiverId,
  receiver_email: selectedReceiverName, // or the freelancer’s email if you have it
  content: text || null,
  file_url
});

  if (error) return showToast(error.message, "error");

  msgContent.value = "";
  msgFileInput.value = "";
  loadChatThread(selectedReceiverId);
  showToast("✅ Message sent", "success");
  showUnreadBadge();
};

async function loadChatThread(userId) {
  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUser.id})`)
    .order("created_at", { ascending: true });
  if (error) return console.error(error);
 

chatThread.innerHTML = data.map((m) => {
  const mine = m.sender_id === currentUser.id;
  const align = mine ? "mine" : "theirs";
  const fileLink = m.file_url ? `<a href="${m.file_url}" target="_blank">📎 File</a>` : "";

  const actions = mine
    ? `<div class="msg-actions">
         <button class="icon-btn small" onclick="editMessage('${m.id}', '${m.content ? m.content.replace(/'/g, "\\'") : ""}')">✏️</button>
         <button class="icon-btn small" onclick="deleteMessage('${m.id}')">🗑️</button>
       </div>`
    : "";

  return `
    <div class="msg ${align}">
      <div class="bubble">
        ${m.content || ""} ${fileLink}
        ${actions}
      </div>
      <div class="timestamp">${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    </div>`;
}).join("");

  chatThread.scrollTop = chatThread.scrollHeight;

  // mark messages as read
  await supabaseClient
    .from("messages")
    .update({ read: true })
    .eq("receiver_id", currentUser.id)
    .eq("sender_id", userId);
}

// === Edit Message ===
window.editMessage = async function (msgId, oldContent) {
  const newContent = prompt("Edit your message:", oldContent);
  if (newContent === null) return; // cancel
  const { error } = await supabaseClient
    .from("messages")
    .update({ content: newContent })
    .eq("id", msgId)
    .eq("sender_id", currentUser.id);
  if (error) return showToast("❌ Error editing message", "error");
  showToast("✏️ Message updated");
  loadChatThread(selectedReceiverId);
};

// === Delete Message ===
window.deleteMessage = async function (msgId) {
  if (!confirm("Delete this message?")) return;
  const { error } = await supabaseClient
    .from("messages")
    .delete()
    .eq("id", msgId)
    .eq("sender_id", currentUser.id);
  if (error) return showToast("❌ Error deleting message", "error");
  showToast("🗑️ Message deleted");
  loadChatThread(selectedReceiverId);
};


// === Reply directly from Inbox ===
window.replyToMessage = async function (userId, name) {
  selectedReceiverId = userId;
  selectedReceiverName = name;
  msgReceiverName.textContent = name;
  await loadChatThread(userId);
  messageModal.classList.remove("hidden");
  blurTarget.style.filter = "blur(5px)";
};

// === Inbox ===
// === Inbox (only messages sent TO current user, row opens chat) ===
async function refreshInbox() {
  const tbody = document.querySelector("#tblInbox tbody");

  // 1️⃣ Fetch messages where the current user is the receiver
  const { data: messages, error: msgError } = await supabaseClient
    .from("messages")
    .select("*")
    .eq("receiver_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (msgError) {
    console.error(msgError);
    return showToast("Error loading inbox", "error");
  }

  if (!messages || messages.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#89a3b5">No messages</td></tr>`;
    return;
  }

  // 2️⃣ Load freelancers for sender + receiver display names
  const userIds = [...new Set(messages.flatMap(m => [m.sender_id, m.receiver_id]))];
  const { data: freelancers } = await supabaseClient
    .from("freelancers")
    .select("user_id, display_name");

  // 3️⃣ Map user IDs → display names
  const nameMap = {};
  (freelancers || []).forEach(f => (nameMap[f.user_id] = f.display_name));

  // 4️⃣ Render clickable rows (no Reply button)
  tbody.innerHTML = messages
    .map((m) => {
      const senderName = nameMap[m.sender_id] || "Unknown";
      const receiverName = nameMap[m.receiver_id] || "You";
      const content = m.content || (m.file_url ? "📎 File" : "");
      const unreadClass = !m.read ? "unread" : "";

      return `
        <tr class="${unreadClass}" style="cursor:pointer"
            onclick="openMessageThread('${m.sender_id}','${senderName}')">
          <td><strong>${senderName}</strong></td>
          <td>${receiverName}</td>
          <td>${content}</td>
          <td>${new Date(m.created_at).toLocaleString()}</td>
        </tr>`;
    })
    .join("");
}


// === Open chat when clicking a row ===
window.openMessageThread = async function (senderId, senderName) {
  // Mark messages as read
  await markMessagesRead(senderId);
  // Open message modal
  messageFreelancer(senderId, senderName, senderId);
};

// === Mark messages as read ===
async function markMessagesRead(fromUserId) {
  await supabaseClient
    .from("messages")
    .update({ read: true })
    .eq("receiver_id", currentUser.id)
    .eq("sender_id", fromUserId);
  // refresh badge after marking
  showUnreadBadge();
}


// === Unread Badge ===
async function showUnreadBadge() {
  const { data } = await supabaseClient
    .from("messages")
    .select("id")
    .eq("receiver_id", currentUser.id)
    .eq("read", false);
  const count = data?.length || 0;
  navInbox.innerHTML = count > 0
    ? `📥 Inbox <span class="badge">${count}</span>`
    : "📥 Inbox";
}

// === Load Freelancers for Project Selector ===
async function loadFreelancerOptions() {
  const select = document.getElementById("freelancerMultiSelect");
  if (!select) return; // safety check

  const { data, error } = await supabaseClient
    .from("freelancers")
    .select("id, display_name");

  if (error) {
    console.error(error);
    showToast("❌ Error loading freelancer options", "error");
    return;
  }

  select.innerHTML = (data || [])
    .map((f) => `<option value="${f.id}">${f.display_name}</option>`)
    .join("");
}


// === Freelancer Form Submit ===
freelancerForm.onsubmit = async (e) => {
  e.preventDefault();

  const fd = new FormData(freelancerForm);
  const data = Object.fromEntries(fd.entries());
  const file = photoInput?.files?.[0] || null;

  const payload = {
    display_name: data.display_name?.trim() || null,
    title: data.title?.trim() || null,
    location: data.location?.trim() || null,
    hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
    bio: data.bio?.trim() || null,
    skills: data.skills ? data.skills.split(",").map(s => s.trim()) : null,
    languages: data.languages?.trim() || null,
    website: data.website?.trim() || null,
    linkedin: data.linkedin?.trim() || null,
    github: data.github?.trim() || null,
    user_id: currentUser?.id || null,
  };

  // Upload photo if present
  if (file) {
    const photoUrl = await uploadFreelancerPhoto(file, crypto.randomUUID());
    if (photoUrl) payload.photo_url = photoUrl;
  }

  const freelancerId = freelancerForm.dataset.id;

  let result;
  if (freelancerId) {
    // ✏️ Update existing freelancer
    result = await supabaseClient
      .from("freelancers")
      .update(payload)
      .eq("id", freelancerId);
  } else {
    // ➕ Insert new freelancer
    result = await supabaseClient
      .from("freelancers")
      .insert(payload);
  }

  if (result.error) {
    console.error(result.error);
    showToast("❌ Error saving freelancer: " + result.error.message, "error");
    return;
  }

  showToast(freelancerId ? "✅ Freelancer updated!" : "✅ Freelancer added!");
  freelancerForm.reset();
  if (photoPreview) photoPreview.src = "assets/default-avatar.png";
  closePanel();
  await loadFreelancers();
};


// === PROJECTS ===
async function loadProjects() {
  const tbody = document.querySelector("#tblProjects tbody");
  const { data: projects, error } = await supabaseClient.from("projects").select("*");
  if (error) {
    showToast("Error loading projects", "error");
    return;
  }

  // Get unique freelancer IDs from all projects
  const allIds = [];
  projects.forEach((p) => {
    if (Array.isArray(p.freelancer_ids)) {
      allIds.push(...p.freelancer_ids);
    } else if (typeof p.freelancer_ids === "string") {
      p.freelancer_ids.split(",").forEach(id => allIds.push(id.trim()));
    }
  });
  const uniqueIds = [...new Set(allIds.filter(Boolean))];

  // Fetch freelancer names once
  let nameMap = {};
  if (uniqueIds.length > 0) {
    const { data: freelancers, error: fErr } = await supabaseClient
      .from("freelancers")
      .select("id, display_name")
      .in("id", uniqueIds);
    if (!fErr && freelancers) {
      freelancers.forEach(f => (nameMap[f.id] = f.display_name));
    }
  }

  // Build table rows
  tbody.innerHTML = "";
  projects.forEach((p) => {
    // map freelancer IDs to names
    let freelancerNames = "-";
    if (Array.isArray(p.freelancer_ids) && p.freelancer_ids.length > 0) {
      freelancerNames = p.freelancer_ids.map(id => nameMap[id] || "Unknown").join(", ");
    } else if (typeof p.freelancer_ids === "string" && p.freelancer_ids) {
      const ids = p.freelancer_ids.split(",").map(id => id.trim());
      freelancerNames = ids.map(id => nameMap[id] || "Unknown").join(", ");
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.project_name}</td>
      <td>${p.client_name}</td>
      <td>${p.client_nationality || "-"}</td>
      <td>${p.phase || "-"}</td>
      <td>${p.type || "-"}</td>
      <td>${p.proposed_budget || "-"}</td>
      <td>${p.approved_budget || "-"}</td>
      <td>${freelancerNames}</td>
      <td class="actions-cell">
        <button class="btn small" onclick="viewProject('${p.id}')">👁️</button>
        <button class="btn small" onclick="editProject('${p.id}')">✏️</button>
        <button class="btn small" onclick="deleteProject('${p.id}')">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  });
}


// === View Project (Side Panel) ===
const viewProjectPanel = document.getElementById("viewProjectPanel");
const closeProjectPanelBtn = document.getElementById("closeProjectPanelBtn");

closeProjectPanelBtn.onclick = () => {
  viewProjectPanel.classList.remove("open");
  blurTarget.style.filter = "none";
};

// 🧩 Make it global (attach to window)
window.viewProject = async function (id) {
  const { data: project, error } = await supabaseClient
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    showToast("Error loading project", "error");
    return;
  }

  // Fill project details
  document.getElementById("projDetailName").textContent = project.project_name || "-";
  document.getElementById("projDetailClient").textContent = project.client_name || "-";
  document.getElementById("projDetailNationality").textContent = project.client_nationality || "-";
  document.getElementById("projDetailPhase").textContent = project.phase || "-";
  document.getElementById("projDetailType").textContent = project.type || "-";
  document.getElementById("projDetailProposed").textContent = project.proposed_budget || "-";
  document.getElementById("projDetailApproved").textContent = project.approved_budget || "-";
  document.getElementById("projDetailDesc").textContent = project.description || "-";

  // === Load assigned freelancers ===
const ul = document.getElementById("projDetailFreelancers");
ul.innerHTML = `<li>Loading…</li>`;

let freelancerIds = [];
if (Array.isArray(project.freelancer_ids)) {
  freelancerIds = project.freelancer_ids;
} else if (typeof project.freelancer_ids === "string") {
  freelancerIds = project.freelancer_ids.split(",").map(s => s.trim()).filter(Boolean);
}

if (freelancerIds.length > 0) {
  const { data: freelancers, error: fErr } = await supabaseClient
    .from("freelancers")
    .select("id, display_name, title")
    .in("id", freelancerIds);

  if (fErr) {
    ul.innerHTML = `<li style="color:#f77">Error loading freelancers</li>`;
  } else if (!freelancers || freelancers.length === 0) {
    ul.innerHTML = `<li>No freelancers assigned</li>`;
  } else {
    ul.innerHTML = freelancers
      .map(f => `<li><strong>${f.display_name}</strong>${f.title ? ` — ${f.title}` : ""}</li>`)
      .join("");
  }
} else {
  ul.innerHTML = `<li>No freelancers assigned</li>`;
}


  // Show panel
  viewProjectPanel.classList.add("open");
  blurTarget.style.filter = "blur(5px)";
};


// === Edit Project ===
window.editProject = async function (id) {
  const { data, error } = await supabaseClient
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return showToast("Error fetching project", "error");

  openPanel("Edit Project");
  projectForm.dataset.id = id;

  // Fill form fields
  Object.keys(data).forEach((key) => {
    const input = projectForm.querySelector(`[name="${key}"]`);
    if (input) input.value = data[key] ?? "";
  });
};

// === Delete Project ===
window.deleteProject = async function (id) {
  if (!confirm("Delete this project?")) return;
  const { error } = await supabaseClient.from("projects").delete().eq("id", id);
  if (error) {
    showToast("❌ Error deleting project", "error");
    return;
  }
  showToast("🗑️ Project deleted", "success");
  loadProjects();
};

// === Update Project on Form Submit (handles edit mode) ===
projectForm.onsubmit = async (e) => {
  e.preventDefault();

  const fd = new FormData(projectForm);
  const data = Object.fromEntries(fd.entries());

  // ✅ Get all selected freelancer IDs as an array
  const freelancerSelect = document.getElementById("freelancerMultiSelect");
  const selectedFreelancers = Array.from(freelancerSelect.selectedOptions).map(opt => opt.value);

  const payload = {
    project_name: data.project_name || null,
    client_name: data.client_name || null,
    client_nationality: data.client_nationality || null,
    description: data.description || null,
    phase: data.phase || null,
    type: data.type || null,
    client_min_budget: data.client_min_budget ? parseFloat(data.client_min_budget) : null,
    client_max_budget: data.client_max_budget ? parseFloat(data.client_max_budget) : null,
    proposed_budget: data.proposed_budget ? parseFloat(data.proposed_budget) : null,
    approved_budget: data.approved_budget ? parseFloat(data.approved_budget) : null,
    profile: data.profile || null,
    required_when: data.required_when || null,
    user_id: currentUser?.id || null,
    freelancer_ids: selectedFreelancers.length ? selectedFreelancers : null, // ✅ now array
  };

  const projectId = projectForm.dataset.id;

  if (projectId) {
    // ✏️ Update
    const { error } = await supabaseClient
      .from("projects")
      .update(payload)
      .eq("id", projectId);

    if (error) {
      showToast("❌ Error updating project", "error");
      return;
    }
    showToast("✅ Project updated!", "success");
  } else {
    // ➕ Insert
    const { error } = await supabaseClient.from("projects").insert(payload);
    if (error) {
      showToast("❌ Error adding project", "error");
      return;
    }
    showToast("✅ Project added!", "success");
  }

  closePanel();
  await loadProjects();
};

// === Init ===
init();