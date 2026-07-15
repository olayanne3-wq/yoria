const API = "/api/beta-admin";

const state = {
  items: [],
  currentCandidateId: null,
};

const STATUS_LABELS = {
  pending: "En attente",
  selected: "Sélectionné",
  invited: "Invité",
  active: "Actif",
  rejected: "Refusé",
};

const LEVEL_LABELS = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  confirme: "Confirmé",
  competiteur: "Compétiteur",
};

const DISTANCE_LABELS = {
  "5-km": "5 km",
  "10-km": "10 km",
  "semi-marathon": "Semi-marathon",
  marathon: "Marathon",
  trail: "Trail",
  debutant: "Je débute",
};

const PLATFORM_LABELS = {
  android: "Android",
  iphone: "iPhone",
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function percentage(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

async function apiRequest(options = {}) {
  const response = await fetch(API, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let result = {};

  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok) {
    const error = new Error(
      result.message || "Une erreur est survenue.",
    );
    error.status = response.status;
    throw error;
  }

  return result;
}

function showAuthenticated(isAuthenticated) {
  $("#login").hidden = isAuthenticated;
  $("#admin").hidden = !isAuthenticated;
  $("#logout").hidden = !isAuthenticated;
  $("#refresh").hidden = !isAuthenticated;
}

async function loadCandidates() {
  $("#loading").hidden = false;
  $("#error").hidden = true;

  try {
    const result = await apiRequest({ method: "GET" });

    state.items = Array.isArray(result.candidates)
      ? result.candidates
      : [];

    renderAll();
  } catch (error) {
    if (error.status === 401) {
      showAuthenticated(false);
      return;
    }

    $("#error").textContent = error.message;
    $("#error").hidden = false;
  } finally {
    $("#loading").hidden = true;
  }
}

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = event.submitter;
  const status = $("#login-status");

  status.textContent = "";
  button.disabled = true;
  button.textContent = "Connexion…";

  try {
    await apiRequest({
      method: "POST",
      body: JSON.stringify({
        action: "login",
        password: $("#password").value,
      }),
    });

    $("#login-form").reset();
    showAuthenticated(true);
    await loadCandidates();
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Se connecter";
  }
});

$("#logout").addEventListener("click", async () => {
  try {
    await apiRequest({
      method: "POST",
      body: JSON.stringify({ action: "logout" }),
    });
  } finally {
    state.items = [];
    showAuthenticated(false);
  }
});

$("#refresh").addEventListener("click", loadCandidates);

function candidateCardHtml(candidate) {
  return `
    <article class="candidate">
      <div>
        <strong>${escapeHtml(candidate.first_name)}</strong>
        <small>${escapeHtml(candidate.email)}</small>

        <div class="chips">
          <span class="chip">
            ${escapeHtml(
              PLATFORM_LABELS[candidate.platform] || candidate.platform,
            )}
          </span>

          <span class="chip">
            ${escapeHtml(
              LEVEL_LABELS[candidate.running_level] || candidate.running_level,
            )}
          </span>

          <span class="badge ${escapeHtml(candidate.status)}">
            ${escapeHtml(
              STATUS_LABELS[candidate.status] || candidate.status,
            )}
          </span>
        </div>
      </div>

      <button
        class="open"
        type="button"
        data-id="${escapeHtml(candidate.id)}"
      >
        Voir
      </button>
    </article>
  `;
}

function countStatus(status) {
  return state.items.filter(
    (candidate) => candidate.status === status,
  ).length;
}

function renderDashboard() {
  const total = state.items.length;

  $("#s-total").textContent = total;
  $("#s-pending").textContent = countStatus("pending");
  $("#s-selected").textContent = countStatus("selected");
  $("#s-invited").textContent = countStatus("invited");
  $("#s-active").textContent = countStatus("active");
  $("#s-rejected").textContent = countStatus("rejected");

  $("#recent").innerHTML =
    state.items.slice(0, 6).map(candidateCardHtml).join("") ||
    '<div class="empty">Aucune candidature.</div>';

  const android = state.items.filter(
    (candidate) => candidate.platform === "android",
  ).length;

  const iphone = state.items.filter(
    (candidate) => candidate.platform === "iphone",
  ).length;

  const strava = state.items.filter(
    (candidate) => candidate.uses_strava,
  ).length;

  const feedback = state.items.filter(
    (candidate) => candidate.accepts_feedback,
  ).length;

  $("#distribution").innerHTML = [
    ["Android", percentage(android, total)],
    ["iPhone", percentage(iphone, total)],
    ["Strava", percentage(strava, total)],
    ["Questionnaire", percentage(feedback, total)],
  ]
    .map(
      ([label, value]) => `
        <div>
          <span>${label}</span>
          <strong>${value} %</strong>
        </div>
      `,
    )
    .join("");
}

function getFilteredCandidates() {
  const search = $("#search").value.trim().toLowerCase();
  const status = $("#status-filter").value;
  const platform = $("#platform-filter").value;

  return state.items.filter((candidate) => {
    const matchesSearch =
      !search ||
      candidate.first_name.toLowerCase().includes(search) ||
      candidate.email.toLowerCase().includes(search);

    const matchesStatus =
      status === "all" || candidate.status === status;

    const matchesPlatform =
      platform === "all" || candidate.platform === platform;

    return matchesSearch && matchesStatus && matchesPlatform;
  });
}

function renderTable() {
  const candidates = getFilteredCandidates();

  $("#tbody").innerHTML = candidates
    .map(
      (candidate) => `
        <tr>
          <td>
            <strong>${escapeHtml(candidate.first_name)}</strong>
            <br>
            <small>${escapeHtml(candidate.email)}</small>
          </td>
          <td>${escapeHtml(
            PLATFORM_LABELS[candidate.platform] || candidate.platform,
          )}</td>
          <td>${escapeHtml(
            LEVEL_LABELS[candidate.running_level] || candidate.running_level,
          )}</td>
          <td>${escapeHtml(candidate.runs_per_week)}</td>
          <td>${escapeHtml(
            DISTANCE_LABELS[candidate.favorite_distance] ||
              candidate.favorite_distance,
          )}</td>
          <td>${candidate.uses_strava ? "Oui" : "Non"}</td>
          <td>
            <span class="badge ${escapeHtml(candidate.status)}">
              ${escapeHtml(
                STATUS_LABELS[candidate.status] || candidate.status,
              )}
            </span>
          </td>
          <td>${escapeHtml(formatDate(candidate.created_at))}</td>
          <td>
            <button
              class="open"
              type="button"
              data-id="${escapeHtml(candidate.id)}"
            >
              Voir
            </button>
          </td>
        </tr>
      `,
    )
    .join("");

  $("#empty").hidden = candidates.length > 0;
}

["search", "status-filter", "platform-filter"].forEach((id) => {
  $(`#${id}`).addEventListener("input", renderTable);
  $(`#${id}`).addEventListener("change", renderTable);
});

function renderStatusLists() {
  const selected = state.items.filter(
    (candidate) => candidate.status === "selected",
  );

  const invited = state.items.filter(
    (candidate) => candidate.status === "invited",
  );

  $("#selected-list").innerHTML =
    selected.map(candidateCardHtml).join("") ||
    '<div class="empty">Aucun sélectionné.</div>';

  $("#invited-list").innerHTML =
    invited.map(candidateCardHtml).join("") ||
    '<div class="empty">Aucun invité.</div>';
}

function groupCounts(field) {
  return state.items.reduce((counts, candidate) => {
    const key = String(candidate[field] ?? "inconnu");
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function barListHtml(values, labels) {
  return `
    <div class="bar-list">
      ${Object.entries(values)
        .map(([key, count]) => {
          const value = percentage(count, state.items.length);

          return `
            <div class="bar">
              <span>${escapeHtml(labels[key] || key)}</span>
              <div class="track">
                <div class="fill" style="width:${value}%"></div>
              </div>
              <strong>${value}%</strong>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderStatistics() {
  const engagement = {
    strava: state.items.filter(
      (candidate) => candidate.uses_strava,
    ).length,
    feedback: state.items.filter(
      (candidate) => candidate.accepts_feedback,
    ).length,
  };

  $("#statistics").innerHTML = `
    <article class="card">
      <h2>Plateformes</h2>
      ${barListHtml(groupCounts("platform"), PLATFORM_LABELS)}
    </article>

    <article class="card">
      <h2>Niveaux</h2>
      ${barListHtml(groupCounts("running_level"), LEVEL_LABELS)}
    </article>

    <article class="card">
      <h2>Distances</h2>
      ${barListHtml(groupCounts("favorite_distance"), DISTANCE_LABELS)}
    </article>

    <article class="card">
      <h2>Engagement</h2>
      ${barListHtml(engagement, {
        strava: "Strava",
        feedback: "Questionnaire",
      })}
    </article>
  `;
}

function renderAll() {
  renderDashboard();
  renderTable();
  renderStatusLists();
  renderStatistics();
}

function getCandidate(candidateId) {
  return state.items.find(
    (candidate) => candidate.id === candidateId,
  );
}

function openCandidate(candidateId) {
  const candidate = getCandidate(candidateId);

  if (!candidate) return;

  state.currentCandidateId = candidateId;

  const invitationDetails = candidate.invited_at
    ? `
      <div class="detail">
        <span>Invitation envoyée</span>
        <strong>${escapeHtml(
          formatDate(candidate.invited_at),
        )}</strong>
      </div>
    `
    : "";

  $("#modal-content").innerHTML = `
    <h2>${escapeHtml(candidate.first_name)}</h2>
    <p>${escapeHtml(candidate.email)}</p>

    <div class="details">
      <div class="detail">
        <span>Plateforme</span>
        <strong>${escapeHtml(
          PLATFORM_LABELS[candidate.platform] || candidate.platform,
        )}</strong>
      </div>

      <div class="detail">
        <span>Niveau</span>
        <strong>${escapeHtml(
          LEVEL_LABELS[candidate.running_level] ||
            candidate.running_level,
        )}</strong>
      </div>

      <div class="detail">
        <span>Sorties</span>
        <strong>${escapeHtml(candidate.runs_per_week)} / semaine</strong>
      </div>

      <div class="detail">
        <span>Distance</span>
        <strong>${escapeHtml(
          DISTANCE_LABELS[candidate.favorite_distance] ||
            candidate.favorite_distance,
        )}</strong>
      </div>

      <div class="detail">
        <span>Strava</span>
        <strong>${candidate.uses_strava ? "Oui" : "Non"}</strong>
      </div>

      <div class="detail">
        <span>Questionnaire</span>
        <strong>${candidate.accepts_feedback ? "Oui" : "Non"}</strong>
      </div>

      <div class="detail">
        <span>Statut</span>
        <strong>${escapeHtml(
          STATUS_LABELS[candidate.status] || candidate.status,
        )}</strong>
      </div>

      <div class="detail">
        <span>Inscription</span>
        <strong>${escapeHtml(formatDate(candidate.created_at))}</strong>
      </div>

      ${invitationDetails}
    </div>

    <div class="message">
      ${
        candidate.message
          ? escapeHtml(candidate.message)
          : "Aucun message."
      }
    </div>

    <div class="modal-actions">
      <button type="button" data-status="selected">
        Sélectionner
      </button>

      <button type="button" data-send-invitation>
        📧 Envoyer l’invitation
      </button>

      <button type="button" data-status="active">
        Marquer actif
      </button>

      <button type="button" data-status="rejected">
        Refuser
      </button>
    </div>
  `;

  $("#modal").hidden = false;
}

function closeModal() {
  $("#modal").hidden = true;
  state.currentCandidateId = null;
}

function setModalButtonsDisabled(disabled) {
  $$("#modal-content button").forEach((button) => {
    button.disabled = disabled;
  });
}

function replaceCandidate(updatedCandidate) {
  const index = state.items.findIndex(
    (candidate) => candidate.id === updatedCandidate.id,
  );

  if (index >= 0) {
    state.items[index] = updatedCandidate;
  }
}

async function updateStatus(status) {
  const candidateId = state.currentCandidateId;

  if (!candidateId) return;

  setModalButtonsDisabled(true);

  try {
    const result = await apiRequest({
      method: "PATCH",
      body: JSON.stringify({
        id: candidateId,
        status,
      }),
    });

    replaceCandidate(result.candidate);
    renderAll();
    openCandidate(candidateId);
  } catch (error) {
    window.alert(error.message);
  } finally {
    setModalButtonsDisabled(false);
  }
}

function showInvitationConfirmation() {
  const candidate = getCandidate(state.currentCandidateId);

  if (!candidate) return;

  const alreadyInvited = Boolean(candidate.invited_at);

  const confirmationText = alreadyInvited
    ? `Une invitation a déjà été envoyée à ${candidate.email} le ${formatDate(
        candidate.invited_at,
      )}.\n\nSouhaites-tu vraiment la renvoyer ?`
    : `Envoyer l’invitation à :\n\n${candidate.first_name}\n${candidate.email}\n\nConfirmer l’envoi ?`;

  if (!window.confirm(confirmationText)) {
    return;
  }

  sendInvitation(candidate.id);
}

async function sendInvitation(candidateId) {
  const button = $("[data-send-invitation]");
  const originalText = button?.textContent;

  setModalButtonsDisabled(true);

  if (button) {
    button.textContent = "Envoi en cours…";
  }

  try {
    const result = await apiRequest({
      method: "PATCH",
      body: JSON.stringify({
        id: candidateId,
        action: "send_invitation",
      }),
    });

    replaceCandidate(result.candidate);
    renderAll();
    openCandidate(candidateId);

    window.alert(
      result.message || "L’invitation a bien été envoyée.",
    );
  } catch (error) {
    window.alert(error.message);
  } finally {
    setModalButtonsDisabled(false);

    const refreshedButton = $("[data-send-invitation]");

    if (refreshedButton) {
      refreshedButton.textContent =
        originalText || "📧 Envoyer l’invitation";
    }
  }
}

document.addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-id]");

  if (openButton) {
    openCandidate(openButton.dataset.id);
    return;
  }

  if (event.target.closest("[data-close]")) {
    closeModal();
    return;
  }

  const statusButton = event.target.closest("[data-status]");

  if (statusButton && state.currentCandidateId) {
    updateStatus(statusButton.dataset.status);
    return;
  }

  if (
    event.target.closest("[data-send-invitation]") &&
    state.currentCandidateId
  ) {
    showInvitationConfirmation();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#modal").hidden) {
    closeModal();
  }
});

const VIEW_TITLES = {
  dashboard: "Tableau de bord",
  applications: "Candidatures",
  selected: "Sélectionnés",
  invited: "Invités",
  statistics: "Statistiques",
};

$$(".nav").forEach((button) => {
  button.addEventListener("click", () => {
    $$(".nav").forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    $$(".view").forEach((panel) => {
      panel.classList.toggle(
        "active",
        panel.dataset.panel === button.dataset.view,
      );
    });

    $("#title").textContent =
      VIEW_TITLES[button.dataset.view] || "Administration";
  });
});

(async function initialize() {
  try {
    await apiRequest({ method: "GET" });
    showAuthenticated(true);
    await loadCandidates();
  } catch {
    showAuthenticated(false);
  }
})();
