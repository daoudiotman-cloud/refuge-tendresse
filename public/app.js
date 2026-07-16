// ================================================
// REFUGE DE LA TENDRESSE - Client App
// ================================================

const API = "";
let currentLang = localStorage.getItem("lang") || "fr";
let currentUser = JSON.parse(localStorage.getItem("refugeUser") || "null");
let userPets = [];
let publicServices = [];
let publicRooms = [];
let publicSettings = {};

// ================================================
// TRANSLATIONS
// ================================================
const T = {
  fr: {
    home:"Accueil", about:"A propos", services:"Services", rooms:"Chambres", contact:"Contact",
    login:"Connexion", register:"Inscription", logout:"Deconnexion", myAccount:"Mon compte",
    myPets:"Mes animaux", myReservations:"Mes reservations",
    heroTitle:"Le refuge de luxe pour vos compagnons",
    heroSub:"Offrez a votre animal un sejour inoubliable dans notre hotel 5 etoiles",
    bookNow:"Reserver maintenant", discoverMore:"Decouvrir",
    yearsExp:"Annees d'experience", happyPets:"Animaux heureux", starRating:"Etoiles",
    aboutTitle:"Notre histoire", aboutText:"Depuis plus de 15 ans, le Refuge de la Tendresse offre un havre de paix pour vos compagnons a quatre pattes.",
    servicesTitle:"Nos services", roomsTitle:"Nos chambres", contactTitle:"Contactez-nous",
    perNight:"/nuit", available:"Disponible", full:"Complet",
    name:"Nom", email:"Email", phone:"Telephone", message:"Message",
    petName:"Nom de l'animal", service:"Service", send:"Envoyer",
    yourName:"Votre nom complet", yourEmail:"Votre email", yourPhone:"Votre telephone",
    password:"Mot de passe", confirmPassword:"Confirmer le mot de passe",
    registerTitle:"Creer un compte", loginTitle:"Se connecter",
    noAccount:"Pas encore de compte ?", haveAccount:"Deja un compte ?",
    registerBtn:"S'inscrire", loginBtn:"Se connecter",
    address:"Adresse", notes:"Notes",
    addPet:"Ajouter un animal", editPet:"Modifier", deletePet:"Supprimer",
    species:"Espece", breed:"Race", age:"Age", weight:"Poids", gender:"Genre",
    color:"Couleur", vaccinated:"Vaccine", sterilized:"Sterilise",
    allergies:"Allergies", diet:"Regime alimentaire", medications:"Medicaments",
    petPhoto:"Photo de l'animal", male:"Male", female:"Femelle",
    dog:"Chien", cat:"Chat", bird:"Oiseau", rabbit:"Lapin", hamster:"Hamster",
    reptile:"Reptile", fish:"Poisson", other:"Autre",
    profileTitle:"Mon profil", profileSaved:"Profil enregistre",
    selectPet:"Selectionnez votre animal", noPets:"Aucun animal enregistre",
    addPetFirst:"Ajoutez d'abord un animal dans votre profil",
    reservationSent:"Reservation envoyee avec succes !",
    welcomeBack:"Bon retour", hello:"Bonjour",
    accountInfo:"Informations du compte", petInfo:"Informations de sante",
    save:"Enregistrer", cancel:"Annuler", close:"Fermer",
    footerDesc:"Le Refuge de la Tendresse est votre partenaire de confiance pour le bien-etre de vos compagnons.",
    quickLinks:"Liens rapides", contactInfo:"Contact", followUs:"Suivez-nous",
    allRights:"Tous droits reserves",
    reqSuccess:"Votre demande a ete envoyee avec succes ! Nous vous contacterons bientot.",
    fillAll:"Veuillez remplir tous les champs obligatoires.",
    passwordMismatch:"Les mots de passe ne correspondent pas.",
    emailExists:"Cet email est deja utilise.",
    invalidLogin:"Email ou mot de passe incorrect.",
    profilePhoto:"Photo de profil"
  },
  en: {
    home:"Home", about:"About", services:"Services", rooms:"Rooms", contact:"Contact",
    login:"Login", register:"Register", logout:"Logout", myAccount:"My Account",
    myPets:"My Pets", myReservations:"My Reservations",
    heroTitle:"The luxury refuge for your companions",
    heroSub:"Give your pet an unforgettable stay in our 5-star hotel",
    bookNow:"Book Now", discoverMore:"Discover",
    yearsExp:"Years experience", happyPets:"Happy pets", starRating:"Stars",
    aboutTitle:"Our Story", aboutText:"For over 15 years, Refuge de la Tendresse has offered a haven of peace for your four-legged companions.",
    servicesTitle:"Our Services", roomsTitle:"Our Rooms", contactTitle:"Contact Us",
    perNight:"/night", available:"Available", full:"Full",
    name:"Name", email:"Email", phone:"Phone", message:"Message",
    petName:"Pet name", service:"Service", send:"Send",
    yourName:"Your full name", yourEmail:"Your email", yourPhone:"Your phone",
    password:"Password", confirmPassword:"Confirm password",
    registerTitle:"Create Account", loginTitle:"Sign In",
    noAccount:"No account yet?", haveAccount:"Already have an account?",
    registerBtn:"Sign Up", loginBtn:"Sign In",
    address:"Address", notes:"Notes",
    addPet:"Add Pet", editPet:"Edit", deletePet:"Delete",
    species:"Species", breed:"Breed", age:"Age", weight:"Weight", gender:"Gender",
    color:"Color", vaccinated:"Vaccinated", sterilized:"Sterilized",
    allergies:"Allergies", diet:"Diet", medications:"Medications",
    petPhoto:"Pet photo", male:"Male", female:"Female",
    dog:"Dog", cat:"Cat", bird:"Bird", rabbit:"Rabbit", hamster:"Hamster",
    reptile:"Reptile", fish:"Fish", other:"Other",
    profileTitle:"My Profile", profileSaved:"Profile saved",
    selectPet:"Select your pet", noPets:"No pets registered",
    addPetFirst:"Add a pet to your profile first",
    reservationSent:"Reservation sent successfully!",
    welcomeBack:"Welcome back", hello:"Hello",
    accountInfo:"Account Information", petInfo:"Health Information",
    save:"Save", cancel:"Cancel", close:"Close",
    footerDesc:"Refuge de la Tendresse is your trusted partner for the well-being of your companions.",
    quickLinks:"Quick Links", contactInfo:"Contact", followUs:"Follow Us",
    allRights:"All rights reserved",
    reqSuccess:"Your request has been sent successfully! We will contact you soon.",
    fillAll:"Please fill in all required fields.",
    passwordMismatch:"Passwords do not match.",
    emailExists:"This email is already in use.",
    invalidLogin:"Invalid email or password.",
    profilePhoto:"Profile photo"
  }
};

const t = (key) => (T[currentLang] && T[currentLang][key]) || T.fr[key] || key;

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  document.documentElement.lang = lang;
  document.body.dir = "ltr";
  document.querySelectorAll(".lang-btn").forEach(b => b.classList.toggle("active", b.dataset.lang === lang));
  translatePage();
}

function translatePage() {
  document.querySelectorAll("[data-t]").forEach(el => {
    const key = el.getAttribute("data-t");
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.placeholder = t(key);
    else el.textContent = t(key);
  });
  document.querySelectorAll("[data-t-html]").forEach(el => {
    el.innerHTML = t(el.getAttribute("data-t-html"));
  });
  updateAuthUI();
}

// ================================================
// AUTH SYSTEM
// ================================================
function updateAuthUI() {
  const authLinks = document.getElementById("authLinks");
  const mobileAuthLinks = document.getElementById("mobileAuthLinks");
  if (!authLinks) return;

  if (currentUser) {
    const html = '<div class="user-menu-wrap">' +
      '<button class="user-menu-btn" onclick="toggleUserMenu()">' +
      (currentUser.photo ? '<img src="'+currentUser.photo+'" class="nav-avatar">' : '<span class="nav-avatar-placeholder">&#128100;</span>') +
      '<span>' + currentUser.name.split(" ")[0] + '</span><span class="user-menu-arrow">&#9660;</span></button>' +
      '<div class="user-dropdown" id="userDropdown">' +
      '<div class="user-dropdown-header">' + t("hello") + ', ' + currentUser.name + '</div>' +
      '<a href="#" onclick="openAccountModal();closeUserMenu()">&#128100; ' + t("myAccount") + '</a>' +
      '<a href="#" onclick="openMyPetsModal();closeUserMenu()">&#128054; ' + t("myPets") + '</a>' +
      '<a href="#" onclick="openMyReservationsModal();closeUserMenu()">&#128203; ' + t("myReservations") + '</a>' +
      '<div class="user-dropdown-divider"></div>' +
      '<a href="#" onclick="handleClientLogout()" class="logout-link">&#128682; ' + t("logout") + '</a>' +
      '</div></div>';
    authLinks.innerHTML = html;
    if (mobileAuthLinks) mobileAuthLinks.innerHTML =
      '<a href="#" onclick="openAccountModal();closeMobileMenu()">' + t("myAccount") + '</a>' +
      '<a href="#" onclick="openMyPetsModal();closeMobileMenu()">' + t("myPets") + '</a>' +
      '<a href="#" onclick="handleClientLogout();closeMobileMenu()">' + t("logout") + '</a>';
  } else {
    authLinks.innerHTML =
      '<button class="btn btn-outline-gold" onclick="openLoginModal()">' + t("login") + '</button>' +
      '<button class="btn btn-gold" onclick="openRegisterModal()">' + t("register") + '</button>';
    if (mobileAuthLinks) mobileAuthLinks.innerHTML =
      '<a href="#" onclick="openLoginModal();closeMobileMenu()">' + t("login") + '</a>' +
      '<a href="#" onclick="openRegisterModal();closeMobileMenu()">' + t("register") + '</a>';
  }
}

function toggleUserMenu() {
  const dd = document.getElementById("userDropdown");
  if (dd) dd.classList.toggle("show");
}
function closeUserMenu() {
  const dd = document.getElementById("userDropdown");
  if (dd) dd.classList.remove("show");
}
document.addEventListener("click", function(e) {
  if (!e.target.closest(".user-menu-wrap")) closeUserMenu();
});

// ================================================
// LOGIN MODAL
// ================================================
function openLoginModal() {
  const html = '<div class="client-modal-content">' +
    '<button class="client-modal-close" onclick="closeClientModal()">&#10005;</button>' +
    '<div class="auth-icon">&#128274;</div>' +
    '<h2>' + t("loginTitle") + '</h2>' +
    '<form onsubmit="handleClientLogin(event)">' +
    '<div class="c-form-group"><label>' + t("email") + ' *</label><input type="email" id="login_email" required></div>' +
    '<div class="c-form-group"><label>' + t("password") + ' *</label><input type="password" id="login_pass" required></div>' +
    '<button type="submit" class="btn-client-primary">' + t("loginBtn") + '</button>' +
    '<p id="loginError" class="auth-error"></p>' +
    '</form>' +
    '<p class="auth-switch">' + t("noAccount") + ' <a href="#" onclick="openRegisterModal()">' + t("register") + '</a></p>' +
    '</div>';
  showClientModal(html);
}

async function handleClientLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login_email").value;
  const pass = document.getElementById("login_pass").value;
  try {
    const res = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email, password:pass }) });
    const data = await res.json();
    if (data.success && data.user) {
      currentUser = data.user;
      localStorage.setItem("refugeUser", JSON.stringify(currentUser));
      closeClientModal();
      loadUserPets();
      updateAuthUI();
      showClientToast(t("welcomeBack") + ", " + currentUser.name + "!");
    } else {
      document.getElementById("loginError").textContent = t("invalidLogin");
    }
  } catch(err) { document.getElementById("loginError").textContent = t("invalidLogin"); }
}

// ================================================
// REGISTER MODAL
// ================================================
function openRegisterModal() {
  const html = '<div class="client-modal-content">' +
    '<button class="client-modal-close" onclick="closeClientModal()">&#10005;</button>' +
    '<div class="auth-icon">&#128221;</div>' +
    '<h2>' + t("registerTitle") + '</h2>' +
    '<form onsubmit="handleClientRegister(event)">' +
    '<div class="c-form-group" style="text-align:center">' +
    '<label class="c-avatar-upload" for="reg_photo_input">' +
    '<div id="reg_photo_preview" class="c-avatar-placeholder">&#128247;<br><small>' + t("profilePhoto") + '</small></div>' +
    '</label>' +
    '<input type="file" id="reg_photo_input" accept="image/*" onchange="previewRegPhoto(event)" style="display:none">' +
    '<input type="hidden" id="reg_photo" value="">' +
    '</div>' +
    '<div class="c-form-row">' +
    '<div class="c-form-group"><label>' + t("name") + ' *</label><input type="text" id="reg_name" required placeholder="' + t("yourName") + '"></div>' +
    '<div class="c-form-group"><label>' + t("phone") + '</label><input type="tel" id="reg_phone" placeholder="' + t("yourPhone") + '"></div>' +
    '</div>' +
    '<div class="c-form-group"><label>' + t("email") + ' *</label><input type="email" id="reg_email" required placeholder="' + t("yourEmail") + '"></div>' +
    '<div class="c-form-group"><label>' + t("address") + '</label><input type="text" id="reg_address" placeholder="' + t("address") + '"></div>' +
    '<div class="c-form-row">' +
    '<div class="c-form-group"><label>' + t("password") + ' *</label><input type="password" id="reg_pass" required minlength="6"></div>' +
    '<div class="c-form-group"><label>' + t("confirmPassword") + ' *</label><input type="password" id="reg_pass2" required></div>' +
    '</div>' +
    '<button type="submit" class="btn-client-primary">' + t("registerBtn") + '</button>' +
    '<p id="regError" class="auth-error"></p>' +
    '</form>' +
    '<p class="auth-switch">' + t("haveAccount") + ' <a href="#" onclick="openLoginModal()">' + t("login") + '</a></p>' +
    '</div>';
  showClientModal(html);
}

function previewRegPhoto(e) {
  const f = e.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById("reg_photo").value = ev.target.result;
    document.getElementById("reg_photo_preview").outerHTML = '<img id="reg_photo_preview" src="' + ev.target.result + '" class="c-avatar-img">';
  };
  reader.readAsDataURL(f);
}

async function handleClientRegister(e) {
  e.preventDefault();
  const pass = document.getElementById("reg_pass").value;
  const pass2 = document.getElementById("reg_pass2").value;
  if (pass !== pass2) { document.getElementById("regError").textContent = t("passwordMismatch"); return; }

  const data = {
    name: document.getElementById("reg_name").value,
    email: document.getElementById("reg_email").value,
    phone: document.getElementById("reg_phone").value,
    address: document.getElementById("reg_address").value,
    photo: document.getElementById("reg_photo").value,
    password: pass
  };
  try {
    const res = await fetch("/api/auth/register", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) });
    const result = await res.json();
    if (result.success && result.user) {
      currentUser = result.user;
      localStorage.setItem("refugeUser", JSON.stringify(currentUser));
      closeClientModal();
      updateAuthUI();
      showClientToast(t("hello") + ", " + currentUser.name + "! &#127881;");
      // Open add pet modal after registration
      setTimeout(() => openAddPetModal(), 1000);
    } else {
      document.getElementById("regError").textContent = result.error || t("emailExists");
    }
  } catch(err) { document.getElementById("regError").textContent = "Error"; }
}

function handleClientLogout() {
  currentUser = null;
  userPets = [];
  localStorage.removeItem("refugeUser");
  updateAuthUI();
  showClientToast(t("logout") + " &#128075;");
}

// ================================================
// ACCOUNT MODAL
// ================================================
function openAccountModal() {
  if (!currentUser) { openLoginModal(); return; }
  const u = currentUser;
  const html = '<div class="client-modal-content">' +
    '<button class="client-modal-close" onclick="closeClientModal()">&#10005;</button>' +
    '<h2>&#128100; ' + t("profileTitle") + '</h2>' +
    '<form onsubmit="saveAccount(event)">' +
    '<div class="c-form-group" style="text-align:center">' +
    '<label class="c-avatar-upload" for="acc_photo_input">' +
    (u.photo ? '<img id="acc_photo_preview" src="'+u.photo+'" class="c-avatar-img">' :
    '<div id="acc_photo_preview" class="c-avatar-placeholder">&#128247;</div>') +
    '</label>' +
    '<input type="file" id="acc_photo_input" accept="image/*" onchange="previewAccPhoto(event)" style="display:none">' +
    '<input type="hidden" id="acc_photo" value="'+(u.photo||"")+'">' +
    '</div>' +
    '<div class="c-form-row">' +
    '<div class="c-form-group"><label>' + t("name") + '</label><input type="text" id="acc_name" value="' + esc(u.name) + '" required></div>' +
    '<div class="c-form-group"><label>' + t("phone") + '</label><input type="tel" id="acc_phone" value="' + esc(u.phone||"") + '"></div>' +
    '</div>' +
    '<div class="c-form-group"><label>' + t("email") + '</label><input type="email" id="acc_email" value="' + esc(u.email) + '" readonly style="opacity:0.6"></div>' +
    '<div class="c-form-group"><label>' + t("address") + '</label><input type="text" id="acc_address" value="' + esc(u.address||"") + '"></div>' +
    '<div class="c-form-group"><label>' + t("notes") + '</label><textarea id="acc_notes" rows="2">' + esc(u.notes||"") + '</textarea></div>' +
    '<button type="submit" class="btn-client-primary">&#128190; ' + t("save") + '</button>' +
    '</form></div>';
  showClientModal(html);
}

function previewAccPhoto(e) {
  const f = e.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById("acc_photo").value = ev.target.result;
    const p = document.getElementById("acc_photo_preview");
    if (p.tagName === "IMG") p.src = ev.target.result;
    else p.outerHTML = '<img id="acc_photo_preview" src="'+ev.target.result+'" class="c-avatar-img">';
  };
  reader.readAsDataURL(f);
}

async function saveAccount(e) {
  e.preventDefault();
  const d = { name:document.getElementById("acc_name").value, phone:document.getElementById("acc_phone").value, address:document.getElementById("acc_address").value, notes:document.getElementById("acc_notes").value, photo:document.getElementById("acc_photo").value };
  try {
    await fetch("/api/clients/"+currentUser.id, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });
    Object.assign(currentUser, d);
    localStorage.setItem("refugeUser", JSON.stringify(currentUser));
    closeClientModal();
    updateAuthUI();
    showClientToast(t("profileSaved") + " &#9989;");
  } catch(err) { showClientToast("Error", "error"); }
}

// ================================================
// MY PETS MODAL
// ================================================
async function loadUserPets() {
  if (!currentUser) return;
  try {
    const res = await fetch("/api/pets?ownerId=" + currentUser.id);
    userPets = await res.json();
    if (!Array.isArray(userPets)) userPets = [];
  } catch(e) { userPets = []; }
}

function openMyPetsModal() {
  if (!currentUser) { openLoginModal(); return; }
  let html = '<div class="client-modal-content">' +
    '<button class="client-modal-close" onclick="closeClientModal()">&#10005;</button>' +
    '<h2>&#128054; ' + t("myPets") + '</h2>' +
    '<button class="btn-client-secondary" onclick="openAddPetModal()" style="margin-bottom:15px">&#10133; ' + t("addPet") + '</button>';

  if (userPets.length) {
    userPets.forEach(p => {
      const specEmoji = p.species==="Chien"||p.species==="Dog"?"&#128021;":p.species==="Chat"||p.species==="Cat"?"&#128049;":"&#128054;";
      html += '<div class="my-pet-card">';
      html += '<div class="my-pet-photo">';
      if (p.photo) html += '<img src="'+p.photo+'">';
      else html += '<div class="my-pet-placeholder">' + specEmoji + '</div>';
      html += '</div><div class="my-pet-info">';
      html += '<div class="my-pet-name">' + specEmoji + ' ' + p.name + '</div>';
      html += '<div class="my-pet-details">';
      if (p.species) html += '<span>' + p.species + '</span>';
      if (p.breed) html += '<span>' + p.breed + '</span>';
      if (p.age) html += '<span>' + p.age + '</span>';
      if (p.weight) html += '<span>' + p.weight + '</span>';
      html += '</div>';
      if (p.vaccinated) html += '<span class="my-pet-badge green">&#128137; ' + t("vaccinated") + '</span>';
      if (p.sterilized) html += '<span class="my-pet-badge blue">&#10004; ' + t("sterilized") + '</span>';
      if (p.allergies) html += '<div class="my-pet-alert">&#9888; ' + p.allergies + '</div>';
      html += '<div class="my-pet-actions">';
      html += '<button class="btn-client-sm" onclick="openEditPetModal(\''+p.id+'\')">&#9998; ' + t("editPet") + '</button>';
      html += '<button class="btn-client-sm danger" onclick="deleteMyPet(\''+p.id+'\')">&#128465; ' + t("deletePet") + '</button>';
      html += '</div></div></div>';
    });
  } else {
    html += '<div class="empty-pets"><div style="font-size:3rem">&#128054;</div><p>' + t("noPets") + '</p>';
    html += '<button class="btn-client-primary" onclick="openAddPetModal()">&#10133; ' + t("addPet") + '</button></div>';
  }
  html += '</div>';
  showClientModal(html);
}

function openAddPetModal() { openPetFormModal(null); }
function openEditPetModal(id) { openPetFormModal(id); }

function openPetFormModal(id) {
  if (!currentUser) { openLoginModal(); return; }
  const p = id ? userPets.find(x => x.id === id) : { name:"",species:"Chien",breed:"",color:"",age:"",weight:"",gender:"",vaccinated:false,sterilized:false,allergies:"",diet:"",medications:"",notes:"",photo:"" };
  const editing = !!id;

  const speciesOptions = ["Chien","Chat","Oiseau","Lapin","Hamster","Reptile","Poisson","Autre"];

  let html = '<div class="client-modal-content">' +
    '<button class="client-modal-close" onclick="closeClientModal()">&#10005;</button>' +
    '<h2>' + (editing?"&#9998; "+t("editPet"):"&#10133; "+t("addPet")) + '</h2>' +
    '<form onsubmit="saveMyPet(event, \''+( id||"")+'\')">';

  // Photo upload
  html += '<div class="c-form-group" style="text-align:center">' +
    '<label class="c-pet-photo-upload" for="mypet_photo_input">' +
    (p.photo ? '<img id="mypet_photo_preview" src="'+p.photo+'" class="c-pet-upload-preview">' :
    '<div id="mypet_photo_preview" class="c-pet-upload-placeholder">&#128247;<br><small>'+t("petPhoto")+'</small></div>') +
    '</label>' +
    '<input type="file" id="mypet_photo_input" accept="image/*" onchange="previewMyPetPhoto(event)" style="display:none">' +
    '<input type="hidden" id="mypet_photo" value="'+(p.photo||"")+'">' +
    '</div>';

  html += '<div class="c-form-row">' +
    '<div class="c-form-group"><label>' + t("name") + ' *</label><input type="text" id="mypet_name" value="'+esc(p.name)+'" required></div>' +
    '<div class="c-form-group"><label>' + t("species") + ' *</label><select id="mypet_species">';
  speciesOptions.forEach(s => { html += '<option value="'+s+'"'+(p.species===s?" selected":"")+'>'+s+'</option>'; });
  html += '</select></div></div>';

  html += '<div class="c-form-row">' +
    '<div class="c-form-group"><label>' + t("breed") + '</label><input type="text" id="mypet_breed" value="'+esc(p.breed)+'" placeholder="Ex: Labrador..."></div>' +
    '<div class="c-form-group"><label>' + t("color") + '</label><input type="text" id="mypet_color" value="'+esc(p.color)+'"></div></div>';

  html += '<div class="c-form-row">' +
    '<div class="c-form-group"><label>' + t("age") + '</label><input type="text" id="mypet_age" value="'+esc(p.age)+'" placeholder="Ex: 3 ans"></div>' +
    '<div class="c-form-group"><label>' + t("weight") + '</label><input type="text" id="mypet_weight" value="'+esc(p.weight)+'" placeholder="Ex: 12 kg"></div></div>';

  html += '<div class="c-form-row">' +
    '<div class="c-form-group"><label>' + t("gender") + '</label><select id="mypet_gender"><option value="">-</option>' +
    '<option value="Male"'+(p.gender==="Male"?" selected":"")+'>' + t("male") + '</option>' +
    '<option value="Femelle"'+(p.gender==="Femelle"?" selected":"")+'>' + t("female") + '</option></select></div>' +
    '<div class="c-form-group"><label>&nbsp;</label>' +
    '<label class="c-checkbox"><input type="checkbox" id="mypet_vacc"'+(p.vaccinated?" checked":"")+'> &#128137; '+t("vaccinated")+'</label>' +
    '<label class="c-checkbox"><input type="checkbox" id="mypet_ster"'+(p.sterilized?" checked":"")+'> &#10004; '+t("sterilized")+'</label>' +
    '</div></div>';

  html += '<div class="c-form-section">' + t("petInfo") + '</div>';
  html += '<div class="c-form-group"><label>' + t("allergies") + '</label><input type="text" id="mypet_allergies" value="'+esc(p.allergies)+'" placeholder="Ex: Poulet, pollen..."></div>';
  html += '<div class="c-form-row">' +
    '<div class="c-form-group"><label>' + t("diet") + '</label><input type="text" id="mypet_diet" value="'+esc(p.diet)+'"></div>' +
    '<div class="c-form-group"><label>' + t("medications") + '</label><input type="text" id="mypet_meds" value="'+esc(p.medications)+'"></div></div>';

  html += '<div class="c-form-group"><label>' + t("notes") + '</label><textarea id="mypet_notes" rows="3">'+esc(p.notes)+'</textarea></div>';

  html += '<div class="c-form-actions">' +
    '<button type="submit" class="btn-client-primary">&#128190; ' + t("save") + '</button>' +
    '<button type="button" class="btn-client-secondary" onclick="openMyPetsModal()">' + t("cancel") + '</button></div></form></div>';

  showClientModal(html);
}

function previewMyPetPhoto(e) {
  const f = e.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById("mypet_photo").value = ev.target.result;
    const p = document.getElementById("mypet_photo_preview");
    if (p.tagName === "IMG") p.src = ev.target.result;
    else p.outerHTML = '<img id="mypet_photo_preview" src="'+ev.target.result+'" class="c-pet-upload-preview">';
  };
  reader.readAsDataURL(f);
}

async function saveMyPet(e, id) {
  e.preventDefault();
  const d = {
    name: document.getElementById("mypet_name").value,
    species: document.getElementById("mypet_species").value,
    breed: document.getElementById("mypet_breed").value,
    color: document.getElementById("mypet_color").value,
    age: document.getElementById("mypet_age").value,
    weight: document.getElementById("mypet_weight").value,
    gender: document.getElementById("mypet_gender").value,
    vaccinated: document.getElementById("mypet_vacc").checked,
    sterilized: document.getElementById("mypet_ster").checked,
    allergies: document.getElementById("mypet_allergies").value,
    diet: document.getElementById("mypet_diet").value,
    medications: document.getElementById("mypet_meds").value,
    notes: document.getElementById("mypet_notes").value,
    photo: document.getElementById("mypet_photo").value,
    ownerId: currentUser.id,
    ownerName: currentUser.name,
    ownerEmail: currentUser.email
  };
  try {
    if (id) await fetch("/api/pets/"+id, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });
    else await fetch("/api/pets", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(d) });
    await loadUserPets();
    openMyPetsModal();
    showClientToast(id ? t("editPet")+" &#9989;" : t("addPet")+" &#9989;");
  } catch(err) { showClientToast("Error","error"); }
}

async function deleteMyPet(id) {
  if (!confirm(t("deletePet") + " ?")) return;
  await fetch("/api/pets/"+id, { method:"DELETE" });
  await loadUserPets();
  openMyPetsModal();
  showClientToast(t("deletePet") + " &#9989;");
}

// ================================================
// MY RESERVATIONS
// ================================================
function openMyReservationsModal() {
  if (!currentUser) { openLoginModal(); return; }
  let html = '<div class="client-modal-content">' +
    '<button class="client-modal-close" onclick="closeClientModal()">&#10005;</button>' +
    '<h2>&#128203; ' + t("myReservations") + '</h2>';

  // This would fetch from API - simplified version
  html += '<div class="empty-pets"><div style="font-size:3rem">&#128203;</div><p>Les reservations seront affichees ici</p></div>';
  html += '</div>';
  showClientModal(html);
}

// ================================================
// CONTACT FORM - Enhanced with pet selection
// ================================================
function renderContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  if (currentUser) {
    // Pre-fill form for logged-in users
    const nameInput = form.querySelector('[name="name"]');
    const emailInput = form.querySelector('[name="email"]');
    const phoneInput = form.querySelector('[name="phone"]');
    if (nameInput && !nameInput.value) nameInput.value = currentUser.name;
    if (emailInput && !emailInput.value) emailInput.value = currentUser.email;
    if (phoneInput && !phoneInput.value) phoneInput.value = currentUser.phone || "";

    // Add pet selector if user has pets
    let petSelect = form.querySelector('#petSelect');
    if (!petSelect && userPets.length > 0) {
      const petGroup = document.createElement("div");
      petGroup.className = "form-group";
      petGroup.innerHTML = '<label>' + t("selectPet") + '</label><select id="petSelect" name="petName" class="form-control">';
      let opts = '<option value="">-- ' + t("selectPet") + ' --</option>';
      userPets.forEach(p => {
        const emoji = p.species==="Chien"||p.species==="Dog"?"&#128021;":p.species==="Chat"||p.species==="Cat"?"&#128049;":"&#128054;";
        opts += '<option value="'+esc(p.name)+'">'+emoji+' '+p.name+' ('+p.species+')</option>';
      });
      petGroup.innerHTML += opts + '</select>';
      const petNameInput = form.querySelector('[name="petName"]');
      if (petNameInput) petNameInput.parentElement.replaceWith(petGroup);
    }
  }
}

async function handleContactSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    name: form.querySelector('[name="name"]').value,
    email: form.querySelector('[name="email"]').value,
    phone: form.querySelector('[name="phone"]').value,
    petName: form.querySelector('[name="petName"]').value,
    service: form.querySelector('[name="service"]').value,
    message: form.querySelector('[name="message"]')?.value || "",
    userId: currentUser ? currentUser.id : null
  };

  if (!data.name || !data.email || !data.petName || !data.service) {
    showClientToast(t("fillAll"), "error");
    return;
  }

  try {
    const res = await fetch("/api/reservations", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) });
    const result = await res.json();
    if (result.success) {
      form.reset();
      showClientToast(t("reservationSent"));
      // Show success message
      const successDiv = document.createElement("div");
      successDiv.className = "success-message";
      successDiv.innerHTML = "&#9989; " + t("reqSuccess");
      form.parentElement.insertBefore(successDiv, form);
      setTimeout(() => successDiv.remove(), 5000);
    }
  } catch(err) { showClientToast("Error","error"); }
}

// ================================================
// CLIENT MODAL SYSTEM
// ================================================
function showClientModal(html) {
  let overlay = document.getElementById("clientModalOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "clientModalOverlay";
    overlay.className = "client-modal-overlay";
    overlay.innerHTML = '<div class="client-modal" id="clientModalBox"></div>';
    overlay.addEventListener("click", function(e) { if (e.target === overlay) closeClientModal(); });
    document.body.appendChild(overlay);
  }
  document.getElementById("clientModalBox").innerHTML = html;
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeClientModal() {
  const overlay = document.getElementById("clientModalOverlay");
  if (overlay) { overlay.classList.remove("active"); document.body.style.overflow = ""; }
}

function showClientToast(msg, type) {
  let toast = document.getElementById("clientToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "clientToast";
    toast.className = "client-toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = msg;
  toast.className = "client-toast show " + (type||"");
  setTimeout(() => { toast.className = "client-toast"; }, 3500);
}

function esc(str) { return (str||"").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;"); }

// ================================================
// LOAD PUBLIC DATA
// ================================================
async function loadPublicData() {
  try {
    const [svcs, rms, sets] = await Promise.all([
      fetch("/api/services").then(r=>r.json()).catch(()=>[]),
      fetch("/api/rooms").then(r=>r.json()).catch(()=>[]),
      fetch("/api/settings").then(r=>r.json()).catch(()=>{})
    ]);
    publicServices = Array.isArray(svcs) ? svcs : [];
    publicRooms = Array.isArray(rms) ? rms : [];
    publicSettings = sets || {};
    renderPublicServices();
    renderPublicRooms();
    renderServiceOptions();
  } catch(e) { console.error(e); }
}

function renderPublicServices() {
  const grid = document.getElementById("servicesGrid");
  if (!grid || !publicServices.length) return;
  grid.innerHTML = "";
  publicServices.forEach(s => {
    grid.innerHTML += '<div class="service-card"><div class="service-icon-wrap"><div class="service-icon">'+(s.icon||"&#128054;")+'</div></div><h3>'+s.name+'</h3><p>'+(s.description||"")+'</p><div class="service-price">'+s.price+' '+(publicSettings.currencySymbol||"EUR")+'<span>/'+(s.unit||"")+'</span></div></div>';
  });
}

function renderPublicRooms() {
  const grid = document.getElementById("roomsGrid");
  if (!grid || !publicRooms.length) return;
  grid.innerHTML = "";
  publicRooms.filter(r => r.status !== "unavailable").forEach(r => {
    const st = r.status === "maintenance" ? "maintenance" : (r.occupied ? "occupied" : "available");
    const emoji = r.type==="royal"?"&#128081;":r.type==="cat"?"&#128049;":"&#128054;";
    grid.innerHTML += '<div class="room-card'+(r.type==="royal"?" featured":"")+'"><div class="room-card-img">'+(r.photo?'<img src="'+r.photo+'">':emoji)+'<div class="room-badge room-badge-'+st+'">'+(st==="available"?t("available"):t("full"))+'</div></div><div class="room-card-body"><h3>'+r.name+'</h3><p>'+(r.description||"")+'</p><div class="room-features"><span>&#128207; '+(r.capacity||"")+'</span><span>&#128081; '+(r.type||"")+'</span></div><div class="room-price"><span class="room-price-value">'+r.price+'</span><span class="room-price-unit">'+(publicSettings.currencySymbol||"EUR")+t("perNight")+'</span></div></div></div>';
  });
}

function renderServiceOptions() {
  const sel = document.querySelector('[name="service"]');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- ' + t("service") + ' --</option>';
  publicServices.forEach(s => {
    sel.innerHTML += '<option value="'+s.key+'">'+(s.icon||"")+" "+s.name+" ("+s.price+" "+(publicSettings.currencySymbol||"EUR")+"/"+s.unit+")"+'</option>';
  });
}

// ================================================
// MOBILE MENU
// ================================================
function openMobileMenu() {
  const m = document.getElementById("mobileMenu");
  if (m) m.classList.add("active");
}
function closeMobileMenu() {
  const m = document.getElementById("mobileMenu");
  if (m) m.classList.remove("active");
}

// ================================================
// NAVBAR SCROLL
// ================================================
window.addEventListener("scroll", function() {
  const nav = document.querySelector(".navbar");
  if (nav) nav.classList.toggle("scrolled", window.scrollY > 50);
});

// ================================================
// INIT
// ================================================
window.addEventListener("DOMContentLoaded", function() {
  setLang(currentLang);
  loadPublicData();
  if (currentUser) {
    loadUserPets().then(() => renderContactForm());
  }

  // Attach contact form submit
  const cf = document.getElementById("contactForm");
  if (cf) cf.addEventListener("submit", handleContactSubmit);

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", function(e) {
      const target = document.querySelector(this.getAttribute("href"));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior:"smooth" }); }
    });
  });

  // PWA install
  let deferredPrompt;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredPrompt = e;
    const btn = document.getElementById("installBtn");
    if (btn) { btn.style.display = "block"; btn.onclick = () => { deferredPrompt.prompt(); }; }
  });
});

// Service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(e => console.log("SW error:", e));
}

