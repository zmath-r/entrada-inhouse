const API_URL = 'http://localhost:3000/api/tokens/generate';
let qrcodeInstance = null;

async function generateToken() {
    const apartmentInput = document.getElementById('apartment');
    const apartment = apartmentInput.value.trim();

    if (!apartment) {
        alert('Por favor, informe o número do apartamento.');
        return;
    }

    const generateBtn = document.getElementById('generateBtn');
    const loading = document.getElementById('loading');
    const resultDiv = document.getElementById('result');

    generateBtn.classList.add('hidden');
    loading.classList.remove('hidden');
    resultDiv.classList.add('hidden');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ apartment })
        });

        const data = await response.json();

        if (response.ok) {
            displayQRCode(data.token);
        } else {
            alert('Erro: ' + (data.error || 'Não foi possível gerar o token.'));
            resetForm();
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        alert('Erro ao conectar com o servidor. Verifique se o backend está rodando.');
        resetForm();
    }
}

function displayQRCode(token) {
    const loading = document.getElementById('loading');
    const resultDiv = document.getElementById('result');
    const qrcodeDiv = document.getElementById('qrcode');
    const tokenString = document.getElementById('tokenString');

    loading.classList.add('hidden');
    resultDiv.classList.remove('hidden');
    tokenString.innerText = token;

    // Limpa o QR code anterior, se existir
    qrcodeDiv.innerHTML = '';
    
    // Gera o novo QR Code
    qrcodeInstance = new QRCode(qrcodeDiv, {
        text: token,
        width: 200,
        height: 200,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
}

function resetForm() {
    document.getElementById('apartment').value = '';
    document.getElementById('generateBtn').classList.remove('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('result').classList.add('hidden');
}
