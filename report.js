document.addEventListener('DOMContentLoaded', () => {
    try {
        // Get analysis result
        const analysisJson = sessionStorage.getItem('analysisResult');
        if (!analysisJson) {
            throw new Error('Keine Analyseergebnisse gefunden');
        }

        let analysis;
        try {
            analysis = JSON.parse(analysisJson);
        } catch (error) {
            throw new Error('Ungültiges Analyseergebnis');
        }

        // Update total savings
        const totalSavingsElement = document.querySelector('.total-savings .amount');
        if (totalSavingsElement) {
            totalSavingsElement.textContent = analysis.totalSavings || '0 €';
        }

        // Create result rows
        const container = document.getElementById('results-container');
        if (!container) {
            throw new Error('Results container not found');
        }
        
        container.innerHTML = '';

        // Add status explanation
        const explanation = document.createElement('div');
        explanation.className = 'status-explanation';
        explanation.innerHTML = `
            <h3>Erklärung der Statusfarben:</h3>
            <div class="status-legend">
                <div class="legend-item">
                    <div class="color-box green"></div>
                    <p><strong>Grün:</strong> Korrekt - Diese Positionen sind rechtlich und rechnerisch einwandfrei.</p>
                </div>
                <div class="legend-item">
                    <div class="color-box yellow"></div>
                    <p><strong>Gelb:</strong> Fraglich - Diese Positionen sollten überprüft werden, da sie möglicherweise problematisch sind.</p>
                </div>
                <div class="legend-item">
                    <div class="color-box red"></div>
                    <p><strong>Rot:</strong> Fehlerhaft - Diese Positionen enthalten Fehler oder verstoßen gegen geltendes Recht.</p>
                </div>
            </div>
        `;
        container.appendChild(explanation);

        // Add results
        if (Array.isArray(analysis.analysis)) {
            analysis.analysis.forEach((item, index) => {
                const row = document.createElement('div');
                row.className = `table-row ${item.status || 'yellow'}`;
                row.innerHTML = `
                    <div class="row-content">
                        <div class="row-info">
                            <h3>${item.point || 'Unbekannte Position'}</h3>
                            <p>${item.problem || 'Keine Details verfügbar'}</p>
                        </div>
                        <div class="row-savings">${item.savings || '0 €'}</div>
                    </div>
                `;
                
                container.appendChild(row);
                setTimeout(() => row.classList.add('visible'), index * 100);
            });
        } else {
            throw new Error('Ungültiges Analyseergebnis: Keine Analysepunkte gefunden');
        }
        
    } catch (error) {
        console.error('Error displaying analysis:', error);
        const container = document.getElementById('results-container');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <h2>Fehler bei der Analyse</h2>
                    <p>${error.message}</p>
                    <button onclick="window.location.href='index.html'" class="retry-button">
                        <i class="fas fa-redo"></i> Neue Analyse starten
                    </button>
                </div>
            `;
        }
    }
});

// Debug modal functions
window.showDebugModal = function() {
    const input = sessionStorage.getItem('geminiInput') || 'No input available';
    const output = sessionStorage.getItem('geminiOutput') || 'No output available';
    
    document.getElementById('gemini-input').textContent = input;
    document.getElementById('gemini-output').textContent = output;
    document.getElementById('debug-modal-overlay').classList.add('visible');
}

window.closeDebugModal = function() {
    document.getElementById('debug-modal-overlay').classList.remove('visible');
}