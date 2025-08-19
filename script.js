/* script.js */
/* Explication des technologies :
 * JavaScript est utilisé pour rendre la page interactive.
 * L'API File et FileReader sont utilisées pour lire le fichier image téléversé par l'utilisateur.
 * L'API Canvas 2D est utilisée pour dessiner et manipuler l'image.
 *   - `drawImage` pour afficher l'image.
 *   - `getImageData` pour accéder aux données de pixels de l'image.
 *   - `putImageData` pour appliquer les modifications de pixels au canvas.
 * Les filtres CSS (contrast, brightness, saturate) sont utilisés pour la prévisualisation en temps réel,
 * car ils sont plus performants pour les ajustements rapides que la manipulation de pixels.
 */

const uploadInput = document.getElementById('upload');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const contrastSlider = document.getElementById('contrast');
const brightnessSlider = document.getElementById('brightness');
const saturationSlider = document.getElementById('saturation');

const applyButton = document.getElementById('apply');
const downloadButton = document.getElementById('download');

let originalImage = null;
let currentImage = null;

// 1. Gérer le téléversement de l'image
uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        originalImage = new Image();
        originalImage.onload = () => {
            // Conserver l'image originale et une copie pour les manipulations
            currentImage = originalImage;
            drawImageOnCanvas(currentImage);
            resetFilters();
            downloadButton.disabled = false;
        };
        originalImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Fonction pour dessiner l'image sur le canvas
function drawImageOnCanvas(image) {
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
}

// 2. Prévisualisation en temps réel avec les filtres CSS
function updatePreview() {
    if (!currentImage) return;
    const contrast = contrastSlider.value;
    const brightness = brightnessSlider.value;
    const saturation = saturationSlider.value;

    canvas.style.filter = `contrast(${contrast}%) brightness(${brightness}%) saturate(${saturation}%)`;
}

contrastSlider.addEventListener('input', updatePreview);
brightnessSlider.addEventListener('input', updatePreview);
saturationSlider.addEventListener('input', updatePreview);

// 3. Appliquer les filtres de manière permanente sur le canvas
applyButton.addEventListener('click', () => {
    if (!currentImage) return;

    const contrast = contrastSlider.value / 100;
    const brightness = brightnessSlider.value / 100;
    const saturation = saturationSlider.value / 100;

    // Appliquer les filtres sur l'image actuelle (qui peut déjà avoir été modifiée)
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    // Appliquer les filtres CSS au contexte temporaire pour le rendu
    tempCtx.filter = `contrast(${contrast*100}%) brightness(${brightness*100}%) saturate(${saturation*100}%)`;
    tempCtx.drawImage(canvas, 0, 0);

    // Obtenir les données de pixels après application des filtres
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    // Effacer le canvas principal et y dessiner les nouvelles données
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, 0);

    // Mettre à jour l'image actuelle pour les futures modifications
    const newImage = new Image();
    newImage.onload = () => {
        currentImage = newImage;
    };
    newImage.src = canvas.toDataURL();


    resetFilters();
});


// Fonction pour réinitialiser les curseurs et la prévisualisation
function resetFilters() {
    contrastSlider.value = 100;
    brightnessSlider.value = 100;
    saturationSlider.value = 100;
    canvas.style.filter = 'none';
}

// 4. Télécharger l'image modifiée
downloadButton.addEventListener('click', () => {
    if (!currentImage) return;

    // Créer un canvas temporaire pour appliquer les filtres avant de télécharger
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    // Appliquer les filtres de prévisualisation actuels
    const contrast = contrastSlider.value;
    const brightness = brightnessSlider.value;
    const saturation = saturationSlider.value;
    tempCtx.filter = `contrast(${contrast}%) brightness(${brightness}%) saturate(${saturation}%)`;

    // Dessiner l'image du canvas principal (avec les modifications permanentes) sur le canvas temporaire
    tempCtx.drawImage(canvas, 0, 0);

    // Créer le lien de téléchargement
    const link = document.createElement('a');
    link.download = 'image-modifiee.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
});
