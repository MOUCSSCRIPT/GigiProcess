// HELPERS
function sanitizeInput(input) {
  return input.replace(/[<>]/g, '').trim();
}

function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function resetForm() {
  ["newNom", "newEdl", "newAdresse", "newEtage"].forEach(id => {
    document.getElementById(id).value = "";
    document.getElementById(id).classList.remove("error-border");
  });
}

// NAVIGATION
function afficherLogin() {
  document.getElementById("homePage").style.display = "none";
  document.getElementById("loginForm").style.display = "block";
  document.getElementById("adminDashboard").style.display = "none";
}

function retourAccueil() {
  document.getElementById("homePage").style.display = "flex";
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("adminDashboard").style.display = "none";
}

function logout() {
  retourAccueil();
}

// CONNEXION
function loginAdmin() {
  const user = document.getElementById("adminUsername").value;
  const pass = document.getElementById("adminPassword").value;
  const error = document.getElementById("loginError");

  if (user === "DEP" && pass === "ELEC") {
    error.style.display = "none";
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("adminDashboard").style.display = "flex";
    document.getElementById("homePage").style.display = "none";
    afficherClients();
  } else {
    error.style.display = "block";
  }
}

// VARIABLES GLOBALES
let allClients = [];
let filteredClients = [];

// INITIALISATION
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("homePage").style.display = "flex";
  document.getElementById("adminDashboard").style.display = "none";
  document.getElementById("loginForm").style.display = "none";

  setupExcelImport();
  loadFromLocalStorage();
});

// LOCAL STORAGE
function loadFromLocalStorage() {
  const storedClients = localStorage.getItem('gasIncidents');
  if (storedClients) {
    allClients = JSON.parse(storedClients);

    allClients.forEach(client => {
      if (!client.normalizedAddress) {
        client.normalizedAddress = normalizeAddress(client.Adresse || client['Matériel & Matricule']);
      }
    });

    filterByAddress();
  }
}

function saveToLocalStorage() {
  localStorage.setItem('gasIncidents', JSON.stringify(allClients));
}

// IMPORT EXCEL
function setupExcelImport() {
  document.getElementById('excel-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      processExcelData(workbook.Sheets[workbook.SheetNames[0]]);
    };

    reader.readAsArrayBuffer(file);
  });
}

function processExcelData(worksheet) {
  allClients = XLSX.utils.sheet_to_json(worksheet).map(client => ({
    ...client,
    Référence: client.EDL || client.Référence,
    normalizedAddress: normalizeAddress(client.Adresse || client['Matériel & Matricule']),
    Formé: client.Formé || false,
    Réouvert: client.Réouvert || false
  }));

  allClients.forEach(client => {
    if (!client.normalizedAddress) {
      client.normalizedAddress = normalizeAddress(client.Adresse || client['Matériel & Matricule']);
    }
  });

  updateAddressList();
  document.getElementById('address-search').value = '';
  filterByAddress();
  saveToLocalStorage();
}

// GESTION DES ADRESSES
function normalizeAddress(rawAddress) {
  if (!rawAddress) return '';
  return rawAddress.toString()
    .replace(/digicode.*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function updateAddressList() {
  const addressList = document.getElementById('address-list');
  addressList.innerHTML = '';

  const uniqueAddresses = [...new Set(allClients.map(c => c.normalizedAddress))];

  uniqueAddresses.forEach(address => {
    const option = document.createElement('option');
    option.value = address;
    addressList.appendChild(option);
  });
}

// FILTRAGE & AFFICHAGE
function filterByAddress() {
  const searchTerm = normalizeAddress(document.getElementById('address-search').value);

  filteredClients = searchTerm 
    ? allClients.filter(c => c.normalizedAddress.includes(searchTerm))
    : [...allClients];

  displayClients();
}

function displayClients() {
  const tbody = document.getElementById('gasIncidentsBody');
  tbody.innerHTML = '';

  filteredClients.forEach((client, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="checkbox-cell">
        <input type="checkbox" id="formed-${index}" 
          ${client.Formé ? 'checked' : ''}
          onchange="updateStatus(${index}, 'Formé', this.checked)">
        <label for="formed-${index}" class="checkbox-custom"></label>
      </td>
      <td class="checkbox-cell">
        <input type="checkbox" id="reopened-${index}" 
          ${client.Réouvert ? 'checked' : ''}
          onchange="updateStatus(${index}, 'Réouvert', this.checked)">
        <label for="reopened-${index}" class="checkbox-custom"></label>
      </td>
      <td>${client.Référence || '-'}</td>
      <td>${client['PDS - Occupant'] || client.nom || '-'}</td>
      <td>${client['État PDS'] || '-'}</td>
      <td>${client.Étage || '-'}</td>
     
       <td> <input type="text" 
               class="comment-input" 
               value="${client['Commentaires EPI'] || ''}" 
               onchange="updateComment(${index}, this.value)">
      </td>
      <!-- Nouvelle colonne Statut -->
      <td class="status-cell ${client.statut || 'en-attente'}">
        ${client.statut || 'En attente'}
      </td>
      <!-- Boutons d'actions -->
      <td class="action-buttons">
        <button class="btn-details" onclick="showDetails(${index})">Voir détails</button>
        <button class="btn-delete" onclick="deleteClient(${index})">Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// MISE À JOUR ÉTATS
function updateStatus(index, field, value) {
  filteredClients[index][field] = value;

  const clientId = filteredClients[index].id;

  let clientIndex = -1;

  if (clientId) {
    clientIndex = allClients.findIndex(c => c.id === clientId);
  }

  if (clientIndex === -1 && filteredClients[index].Référence) {
    clientIndex = allClients.findIndex(c => c.Référence === filteredClients[index].Référence);
  }

  if (clientIndex !== -1) {
    allClients[clientIndex][field] = value;
  }

  clearTimeout(window.saveTimeout);
  window.saveTimeout = setTimeout(() => {
    saveToLocalStorage();
    showAlert("Modifications sauvegardées", "success");
  }, 1000);
}

// RECHERCHE
function resetSearch() {
  document.getElementById('address-search').value = '';
  filterByAddress();
}

document.getElementById('address-search').addEventListener('input', function() {
  clearTimeout(this.searchTimeout);
  this.searchTimeout = setTimeout(filterByAddress, 300);
});

// AJOUT CLIENT
function ajouterClientDepuisFormulaire() {
  const formData = {
    Référence: sanitizeInput(document.getElementById("newEdl").value.trim()),
    nom: sanitizeInput(document.getElementById("newNom").value.trim()),
    adresse: sanitizeInput(document.getElementById("newAdresse").value.trim()),
    Étage: sanitizeInput(document.getElementById("newEtage").value.trim()),
    Formé: false,
    Réouvert: false,
    normalizedAddress: "",
    id: generateUniqueId(),
    dateAjout: new Date().toISOString(),

    // Champs nécessaires à l'affichage du tableau
    ['PDS - Occupant']: sanitizeInput(document.getElementById("newNom").value.trim()),
    ['État PDS']: "",
    ['Matériel & Matricule']: "",
    ['Commentaires EPI']: ""
  };

  if (!formData.Référence || !formData.nom || !formData.adresse) {
    showAlert("Nom, Référence et Adresse sont obligatoires", "error");
    highlightEmptyFields(formData.nom, formData.Référence, formData.adresse);
    return;
  }

  if (allClients.some(c => c.Référence === formData.Référence)) {
    showAlert("Cette référence existe déjà", "error");
    document.getElementById("newEdl").focus();
    document.getElementById("newEdl").classList.add("error-border");
    return;
  }

  formData.normalizedAddress = normalizeAddress(formData.adresse || formData['Adresse'] || formData['Matériel & Matricule']);
  allClients.push(formData);

  saveToLocalStorage();
  updateAddressList();
  document.getElementById('address-search').value = '';
  filterByAddress();
  resetForm();

  showAlert(`Client ajouté (Réf: ${formData.Référence})`, "success");
}

/////////////:
// Mise à jour des commentaires
function updateComment(index, newComment) {
  filteredClients[index]['Commentaires EPI'] = newComment;
  
  // Trouver et mettre à jour dans allClients
  const clientRef = filteredClients[index].Référence;
  const clientIndex = allClients.findIndex(c => c.Référence === clientRef);
  if (clientIndex !== -1) {
    allClients[clientIndex]['Commentaires EPI'] = newComment;
    saveToLocalStorage();
  }
}

// Suppression d'un client
function deleteClient(index) {
  if (confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) {
    const clientRef = filteredClients[index].Référence;
    allClients = allClients.filter(c => c.Référence !== clientRef);
    filteredClients.splice(index, 1);
    
    saveToLocalStorage();
    displayClients();
    showAlert("Client supprimé avec succès", "success");
  }
}

function afficherDetails() {
  const edl = document.getElementById("searchinput").value.trim();
  if (!edl) {
    showAlert("Veuillez entrer un EDL", "error");
    return;
  }

  const client = allClients.find(c => c.Référence === edl);
  if (!client) {
    showAlert("Aucun client trouvé avec cet EDL", "error");
    return;
  }

  // Afficher les infos client
  document.getElementById("nomClient").textContent = client.nom || client['PDS - Occupant'] || "Non renseigné";
  document.getElementById("adresseClient").textContent = client.Adresse || "Non renseignée";

  // Stocker l'EDL pour la validation
  document.getElementById("details").dataset.edl = edl;
}
function valider() {
  const edl = document.getElementById("details").dataset.edl;
  if (!edl) {
    showAlert("Veuillez d'abord rechercher votre EDL", "error");
    return;
  }

  // Vérifier les conditions
  if (!document.getElementById("checkInfo").checked || 
      !document.getElementById("checkAttestation").checked) {
    document.getElementById("errorMessage").style.display = "block";
    return;
  }

  // Gérer la photo
  const photoInput = document.getElementById("photoInput");
  let photoData = null;

  if (photoInput.files.length > 0) {
    const reader = new FileReader();
    reader.onload = function(e) {
      photoData = e.target.result;
      completeValidation(edl, photoData);
    };
    reader.readAsDataURL(photoInput.files[0]);
  } else {
    completeValidation(edl, null);
  }
}

function completeValidation(edl, photoData) {
  // Trouver le client
  const clientIndex = allClients.findIndex(c => c.Référence === edl);
  if (clientIndex === -1) return;

  // Mettre à jour le statut et la photo
  allClients[clientIndex].statut = "validé";
  if (photoData) {
    allClients[clientIndex].image = photoData;
  }

  // Sauvegarder et afficher confirmation
  saveToLocalStorage();
  document.getElementById("errorMessage").style.display = "none";
  document.getElementById("successMessage").style.display = "block";
  
  // Réinitialiser après 3s
  setTimeout(() => {
    document.getElementById("successMessage").style.display = "none";
    resetForm();
  }, 3000);
}

function resetForm() {
  document.getElementById("searchinput").value = "";
  document.getElementById("nomClient").textContent = "";
  document.getElementById("adresseClient").textContent = "";
  document.getElementById("checkInfo").checked = false;
  document.getElementById("checkAttestation").checked = false;
  document.getElementById("photoInput").value = "";
  delete document.getElementById("details").dataset.edl;
}

