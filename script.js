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
const enhanceButton = document.getElementById('enhance');
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

// 5. Améliorer la qualité avec un filtre de netteté (Sharpen)
/* Explication de l'algorithme de netteté :
 * Cette fonction utilise une "matrice de convolution". C'est une technique de traitement d'image
 * qui modifie la valeur d'un pixel en fonction de la valeur de ses voisins.
 * La matrice (ou "noyau") utilisée ici est un filtre passe-haut classique qui accentue les bords.
 *   [ 0, -1,  0]
 *   [-1,  5, -1]
 *   [ 0, -1,  0]
 * Pour chaque pixel, on multiplie sa valeur et celles de ses voisins par les valeurs correspondantes
 * dans la matrice et on additionne les résultats. Le résultat remplace la valeur du pixel central.
 * Le fait que la somme des valeurs de la matrice est 1 (5 - 4*1) assure que la luminosité globale
 * de l'image est préservée.
 */
enhanceButton.addEventListener('click', () => {
    if (!currentImage) return;

    // Désactiver les filtres de prévisualisation pour ne pas les appliquer deux fois
    const currentFilter = canvas.style.filter;
    canvas.style.filter = 'none';

    // Appliquer le filtre de netteté
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const sharpenedData = applyConvolution(imageData, [
        [0, -1, 0],
        [-1, 5, -1],
        [0, -1, 0]
    ]);

    ctx.putImageData(sharpenedData, 0, 0);

    // Mettre à jour l'image actuelle pour les futures modifications
    const newImage = new Image();
    newImage.onload = () => {
        currentImage = newImage;
        // Rétablir les filtres de prévisualisation s'il y en avait
        canvas.style.filter = currentFilter;
    };
    newImage.src = canvas.toDataURL();
});

function applyConvolution(imageData, kernel) {
    const src = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Créer une copie des données de pixels pour le résultat.
    // Cela préserve les pixels des bords et nous permet de lire depuis `src`
    // tout en écrivant dans `outputData` sans conflit.
    const outputData = new Uint8ClampedArray(src);

    const kernelSize = kernel.length;
    const halfKernel = Math.floor(kernelSize / 2);

    // Parcourir chaque pixel de l'image, sauf les bords
    for (let y = halfKernel; y < height - halfKernel; y++) {
        for (let x = halfKernel; x < width - halfKernel; x++) {
            let r = 0, g = 0, b = 0;

            // Appliquer le noyau de convolution
            for (let ky = 0; ky < kernelSize; ky++) {
                for (let kx = 0; kx < kernelSize; kx++) {
                    const K = kernel[ky][kx];
                    if (K === 0) continue; // Optimisation

                    const pixelY = y + ky - halfKernel;
                    const pixelX = x + kx - halfKernel;
                    const index = (pixelY * width + pixelX) * 4;

                    r += src[index] * K;
                    g += src[index + 1] * K;
                    b += src[index + 2] * K;
                }
            }

            const dstIndex = (y * width + x) * 4;
            outputData[dstIndex] = r;     // Le Uint8ClampedArray gère le bornage (clamping) entre 0 et 255
            outputData[dstIndex + 1] = g;
            outputData[dstIndex + 2] = b;
        }
    }
    return new ImageData(outputData, width, height);
}


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
