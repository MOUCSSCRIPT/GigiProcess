let clients = [];

// INIT
window.onload = () => {
  document.getElementById("homePage").style.display = "flex";
  document.getElementById("adminDashboard").style.display = "none";
  document.getElementById("loginForm").style.display = "none";
};

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

// AFFICHAGE CLIENTS
function afficherClients() {
  const tbody = document.getElementById('clientTableBody');
  tbody.innerHTML = '';
  clients.forEach((client, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${client.edl}</td>
      <td>${client.adresse}</td>
      <td>${client.etage}</td>
      <td>${client.statut}</td>
      <td>
        <button onclick="supprimerClient(${index})">Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}



function supprimerClient(i) {
  if (confirm("Supprimer ce client ?")) {
    clients.splice(i, 1);
    afficherClients();
  }
}

// FORMULAIRE
function ajouterClientDepuisFormulaire() {
  const edl = document.getElementById("newEdl").value.trim();
  const adresse = document.getElementById("newAdresse").value.trim();
  const etage = document.getElementById("newEtage").value.trim();

  if (!edl || !adresse || !etage) return alert("Champs manquants");

  if (clients.find(c => c.edl === edl)) return alert("EDL déjà existant");

  clients.push({ edl, adresse, etage, statut: "En attente" });
  afficherClients();

  document.getElementById("newEdl").value = "";
  document.getElementById("newAdresse").value = "";
  document.getElementById("newEtage").value = "";
}


// IMPORT EXCEL
document.getElementById("importExcel").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    for (let i = 1; i < rows.length; i++) {
      const [edl, adresse, etage, statut = "En attente"] = rows[i];
      if (!clients.find(c => c.edl === edl)) {
        clients.push({ edl, adresse, etage, statut });
      }
    }

    afficherClients();
  };

  reader.readAsArrayBuffer(file);
});
  // Fonction pour afficher les détails du client depuis la page d'accueil
  function afficherDetails() {
    const edl = document.getElementById("searchinput").value.trim(); // Récupère l'EDL tapé par l'utilisateur
    const client = clients.find(c => c.edl === edl); // Cherche un client avec cet EDL
    if (!edl) { // Si l'EDL est vide
      alert("Veuillez entrer un EDL.");
      return;
    }
  
    if (!client) {
      alert("Aucun client trouvé avec cet EDL !");
      return;
    }
  
    // Si un client est trouvé, affiche ses informations
    document.getElementById("nomClient").innerText = client.nom || "Nom inconnu";
    document.getElementById("adresseClient").innerText = client.adresse || "Adresse inconnue";
  }
  
  
  // VALIDATION PAR LE CLIENT
  function valider() {
        const edl = document.getElementById("searchinput").value.trim();
        const checkInfo = document.getElementById("checkInfo").checked;
        const checkAttestation = document.getElementById("checkAttestation").checked;
        const photoInput = document.getElementById("photoInput");
        const errorMsg = document.getElementById("errorMessage");
        const successMsg = document.getElementById("successMessage");
  
        const client = clients.find(c => c.edl === edl);
  
        /////////
        if (!client || !checkInfo || !checkAttestation || !photoInput.files.length) {
      errorMessage.style.display = "block";
      successMessage.style.display = "none";
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      const photoBase64 = e.target.result;
  
      client.photo = photoBase64;
      client.dateValidation = new Date().toLocaleString();
  
      errorMessage.style.display = "none";
      successMessage.style.display = "block";
    };
  
    reader.readAsDataURL(photoInput.files[0]);
  }
  
  

