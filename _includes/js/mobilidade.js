// ========================================================================
// 8.1. MOTOR DE MOBILIDADE: RADAR E ETA 
// ========================================================================

// --- Central Layout Detector ---
// Uses matchMedia for reliable CSS-synced breakpoint detection.
const isDesktop = () => window.matchMedia('(min-width: 768px)').matches;

let onibusSelecionadoGPS = null;
let idIntervaloGPS = null;
let idIntervaloRadar = null;
let wakeLockAtivo = null;

let busMarker = null;
const busIcon = L.divIcon({
    className: 'custom-bus-marker',
    html: '<div style="background-color: var(--accent); width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-size: 12px;">🚌</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

// Default city coordinates (Ceará-Mirim)
const CIDADE_DEFAULT_LAT = -5.6322;
const CIDADE_DEFAULT_LNG = -35.4267;

function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function calcularETA(distanciaKm) {
    const velMediaKmH = 25;
    const tempoHoras = distanciaKm / velMediaKmH;
    const tempoMinutos = Math.round(tempoHoras * 60);
    if (tempoMinutos <= 2) return "A chegar!";
    return `~ ${tempoMinutos} min`;
}

function abrirRadarMasterView() {
    switchView('view-radar');

    if (typeof carregarViagensDisponiveisEstudante === 'function') {
        carregarViagensDisponiveisEstudante();
    }

    // Desktop: proactively initialize the map canvas with general city view
    // so the right pane is never blank while the trip list loads.
    if (isDesktop()) {
        const mapaContainer = document.getElementById('radar-mapa-container');
        if (mapaContainer) {
            mapaContainer.classList.remove('hidden');
            void mapaContainer.offsetHeight; // Synchronous reflow trigger

            requestAnimationFrame(() => {
                _inicializarMapaDesktopStandby();
            });
        }
    }
}

/**
 * Initializes a lightweight standby map for desktop split-view.
 * Shows general city area until a specific trip is selected.
 */
function _inicializarMapaDesktopStandby() {
    const container = document.getElementById('mapa-paradas-container');
    if (!container) return;
    container.style.display = 'block';

    // If a map already exists, just recalculate size
    if (mapInstance !== null) {
        mapInstance.invalidateSize();
        return;
    }

    mapInstance = L.map('mapa-paradas-container', { zoomControl: false })
        .setView([CIDADE_DEFAULT_LAT, CIDADE_DEFAULT_LNG], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance);

    // Status bar: standby
    const statusBar = document.getElementById('radar-status-bar');
    const statusText = document.getElementById('radar-status-text');
    if (statusBar && statusText) {
        statusBar.style.background = '#6B7280';
        statusBar.style.color = 'white';
        statusText.textContent = '🗺️ Selecione uma viagem na lista';
    }

    setTimeout(() => {
        if (mapInstance) mapInstance.invalidateSize();
    }, 200);
}

function abrirMapaDaViagem(idViagem) {
    if (!window.lastViagens) return;
    const tripData = window.lastViagens.find(v => v.id === idViagem);
    if (!tripData) return;

    const desktopActive = isDesktop();

    if (desktopActive) {
        // Desktop: map canvas is already visible via CSS split-view.
        // Just load the route data into the existing map instance.
        requestAnimationFrame(() => {
            inicializarMapaMobilidade(tripData);
            setTimeout(() => {
                if (mapInstance) mapInstance.invalidateSize();
            }, 150);
        });
    } else {
        // Mobile: standard Master-Detail toggle
        document.getElementById('radar-lista-container').classList.add('hidden');
        const mapaContainer = document.getElementById('radar-mapa-container');
        mapaContainer.classList.remove('hidden');

        void mapaContainer.offsetHeight;

        requestAnimationFrame(() => {
            inicializarMapaMobilidade(tripData);
            setTimeout(() => {
                if (mapInstance) mapInstance.invalidateSize();
            }, 150);
        });
    }
}

function fecharMapaVoltarLista() {
    const desktopActive = isDesktop();

    if (desktopActive) {
        // Desktop: don't toggle views — clear active route markers
        // and reset to general standby map view.
        if (mapInstance !== null) {
            mapInstance.off();
            mapInstance.remove();
            mapInstance = null;
            busMarker = null;
        }
        // Re-initialize the standby map so the pane isn't blank
        _inicializarMapaDesktopStandby();
    } else {
        // Mobile: toggle visibility back to list
        document.getElementById('radar-mapa-container').classList.add('hidden');
        document.getElementById('radar-lista-container').classList.remove('hidden');

        // Destroy map instance to save mobile memory
        if (mapInstance !== null) {
            mapInstance.off();
            mapInstance.remove();
            mapInstance = null;
            busMarker = null;
        }
    }
}

async function carregarViagensDisponiveisEstudante() {
    if (typeof currentWalletId === 'undefined' || !currentWalletId) {
        showToast("Sessão inválida para aceder às viagens.", "error");
        return;
    }

    const painelMob = document.getElementById('view-mobilidade');
    const containerLista = document.getElementById('lista-viagens-cards');
    const painelSucesso = document.getElementById('painel-viagem-ativa');

    if (painelMob) painelMob.style.display = 'block';
    if (painelSucesso) painelSucesso.innerHTML = '';

    if (containerLista) {
        containerLista.innerHTML = `<div class="loader" style="margin: 0 auto 10px auto; width: 25px; height: 25px; border-width: 3px;"></div><p style="font-size: 11px; color: var(--text-sub);">A procurar autocarros...</p>`;
        containerLista.classList.remove('hidden');
    }

    try {
        if (painelMob) painelMob.scrollIntoView({ behavior: 'smooth', block: 'start' });

        const res = await apiCall("getViagensDisponiveisPortal", { idEstudante: currentWalletId });
        console.warn("🔍 [DEBUG PWA] Raw response from getViagensDisponiveisPortal:");
        console.dir(res);

        if (!res.sucesso) {
            if (containerLista) containerLista.innerHTML = `<p style="font-size: 11px; color: var(--danger);">Erro: ${res.erro}</p>`;
            return;
        }

        if (res.emViagem) {
            if (containerLista) containerLista.classList.add('hidden');
            onibusSelecionadoGPS = res.dadosViagem.idOnibus;
            abrirPainelViagem();
            return;
        }

        if (!res.viagens || res.viagens.length === 0) {
            if (busMarker && typeof mapInstance !== 'undefined' && mapInstance) {
                mapInstance.removeLayer(busMarker);
            }
            busMarker = null;

            let msgEmpty = "Nenhum embarque previsto para agora.";
            if (res.statusOperacao === "FORA_DE_HORARIO") {
                msgEmpty = "<b>Fora do Horário de Embarque.</b><br>Os autocarros só aparecem aqui minutos antes da hora de partida da sua rota.";
            } else if (res.statusOperacao === "SEM_FROTA") {
                msgEmpty = "Não há autocarros ativos associados à sua rota neste momento.";
            }
            if (containerLista) containerLista.innerHTML = `<div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; color: #92400e; font-size: 12px; line-height: 1.4; text-align:left;">${msgEmpty}</div>`;
            return;
        }

        let html = `<p style="font-size: 11px; color: var(--text-sub); margin-bottom: 10px;">Selecione o seu autocarro para garantir lugar:</p>`;

        // Armazenar na window para acesso no check-in
        window.lastViagens = res.viagens;

        res.viagens.forEach((v, index) => {
            let checkinArea = "";
            let statusVagas = "";

            if (v.estadoRadar === "EM_OPERACAO") {
                const labelLota = v.vagasRestantes > 0 ? `<span style="color:var(--success); font-weight:bold;">${v.vagasRestantes} vagas livres</span>` : `<span style="color:var(--danger); font-weight:bold;">LOTADO</span>`;
                const btnDisable = v.vagasRestantes <= 0 ? "disabled" : "";
                const btnBg = v.vagasRestantes <= 0 ? "#ccc" : "var(--primary)";
                statusVagas = labelLota;
                checkinArea = `<button class="hide-on-desktop" ${btnDisable} onclick="confirmarEmbarque('${v.id}')" style="flex: 1; background: ${btnBg}; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">FAZER CHECK-IN</button>`;
            } else {
                statusVagas = `<span style="color:#6B7280; font-weight:bold;">Embarque fechado (Capacidade: ${v.vagasRestantes})</span>`;
                checkinArea = `<button class="hide-on-desktop" disabled style="flex: 1; background: #e5e7eb; color: #9ca3af; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: not-allowed;">AGUARDE...</button>`;
            }

            const borderHighlight = index === 0 ? "border: 2px solid var(--primary);" : "border: 1px solid var(--border); opacity: 0.8;";

            html += `
<div style="background: var(--secondary); padding: 12px; border-radius: 8px; margin-bottom: 10px; text-align: left; ${borderHighlight}">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
     <strong style="font-size: 13px;">🚌 ${v.rota}</strong>
     <span style="font-size: 11px; background: #e0e7ff; padding: 2px 6px; border-radius: 4px; color: #3730a3;">${v.horario}</span>
  </div>
  <div style="font-size: 11px; margin-bottom: 10px;">${statusVagas}</div>
  <div style="display: flex; justify-content: space-between; gap: 8px;">
     <button class="btn-solid" onclick="abrirMapaDaViagem('${v.id}')" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; flex: 1;">VER MAPA 🗺️</button>
     ${checkinArea}
  </div>
</div>`;
        });

        if (containerLista) containerLista.innerHTML = html;

    } catch (e) {
        if (containerLista) containerLista.innerHTML = `<p style="font-size: 11px; color: var(--danger);">Não foi possível atualizar a logística.</p>`;
    }
}

async function confirmarEmbarque(idOnibus) {
    showToast("A verificar localização (GPS)...", "loading");

    if (!navigator.geolocation) {
        showToast("O GPS é obrigatório e deve estar exato para embarcar.", "error");
        return;
    }

    try {
        const posicao = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0
            });
        });

        const lat = posicao.coords.latitude;
        const lng = posicao.coords.longitude;

        // Geofencing 150m check if state is EM_OPERACAO
        if (window.lastViagens) {
            const tripData = window.lastViagens.find(v => v.id === idOnibus);
            if (tripData && tripData.estadoRadar === "EM_OPERACAO" && tripData.paradas) {
                let isNearStop = false;
                for (let i = 0; i < tripData.paradas.length; i++) {
                    const dist = calcularDistanciaHaversine(lat, lng, tripData.paradas[i].LATITUDE, tripData.paradas[i].LONGITUDE);
                    if (dist <= 0.150) { // 150 metros = 0.150 km
                        isNearStop = true;
                        break;
                    }
                }
                if (!isNearStop) {
                    showToast("Deve estar a menos de 150m de uma paragem para fazer check-in nesta fase.", "error");
                    return;
                }
            }
        }

        showToast("GPS adquirido. A processar lugar...", "loading");

        const res = await apiCall("realizarCheckInOnibus", {
            idOnibus: idOnibus,
            idEstudante: currentWalletId,
            lat: lat,
            lng: lng
        });

        if (res.sucesso) {
            showToast("Lugar Confirmado!", "success");
            onibusSelecionadoGPS = idOnibus;

            const desktopActive = isDesktop();

            // On mobile, hide the list; on desktop, keep both visible
            if (!desktopActive) {
                document.getElementById('radar-lista-container').classList.add('hidden');
            }
            const mapaContainer = document.getElementById('radar-mapa-container');
            mapaContainer.classList.remove('hidden');
            
            abrirPainelViagem();

            void mapaContainer.offsetHeight;

            requestAnimationFrame(() => {
                // Initialize the map for the confirmed trip
                if (window.lastViagens) {
                    const tripData = window.lastViagens.find(v => v.id === idOnibus);
                    if (tripData) {
                        inicializarMapaMobilidade(tripData);
                    }
                }

                // Force Leaflet to recalculate size
                setTimeout(() => {
                    if (mapInstance) mapInstance.invalidateSize();
                }, 150);
            });
        } else {
            showToast(res.erro || "Lotação atingida no momento do clique.", "error");
            carregarViagensDisponiveisEstudante();
        }
    } catch (e) {
        if (e instanceof GeolocationPositionError || (e && e.code)) {
            showToast("O GPS é obrigatório e deve estar exato para embarcar.", "error");
        } else {
            showToast("Erro ao processar reserva.", "error");
        }
    }
}

function abrirPainelViagem() {
    const painelSucesso = document.getElementById('painel-viagem-ativa');
    if (!painelSucesso) return;

    painelSucesso.innerHTML = `
      <div style="background: var(--secondary); padding: 20px; border-radius: 8px; border: 1px solid var(--border);">
         <h3 style="color: var(--success); margin: 0 0 10px 0; font-size: 18px;">✅ Check-in Confirmado</h3>
         <p style="font-size: 12px; color: var(--text-sub); margin-bottom: 20px;">O seu lugar está garantido. Acompanhe a viagem no radar abaixo.</p>
         <div id="radar-dinamico-conteudo" style="background: white; border-radius: 8px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <div class="loader" style="margin: 0 auto; width: 20px; height: 20px; border-width: 2px;"></div>
            <p style="font-size: 11px; text-align: center; margin-top: 10px; color: #666;">A sincronizar radar...</p>
         </div>
      </div>
    `;
    painelSucesso.classList.remove('hidden');

    atualizarRadarDinamico();
    if (idIntervaloRadar) clearInterval(idIntervaloRadar);
    idIntervaloRadar = setInterval(atualizarRadarDinamico, 30000);
}

async function atualizarRadarDinamico() {
    if (!onibusSelecionadoGPS) return;
    const boxRadar = document.getElementById('radar-dinamico-conteudo');
    if (!boxRadar) return;

    try {
        const res = await apiCall("statusRadarOnibus", { idOnibus: onibusSelecionadoGPS, idEstudante: currentWalletId });

        if (res.coordenadas) {
            atualizarPosicaoOnibusMapa(res.coordenadas.lat, res.coordenadas.lng);
        }

        // --- Injetar CSS de animação ---
        if (!document.getElementById('radar-pulse-css')) {
            const style = document.createElement('style');
            style.id = 'radar-pulse-css';
            style.innerHTML = `@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }`;
            document.head.appendChild(style);
        }

        // --- UI do Guia (Transmissor Ativo) ---
        if (res.isGuia) {
            boxRadar.innerHTML = `
                <div style="text-align:center;">
                   <div style="font-size: 40px; margin-bottom: 10px; animation: pulse 2s infinite;">📡</div>
                   <h4 style="color: var(--success); margin: 0 0 5px 0;">Transmissão Ativa</h4>
                   <p style="font-size: 11px; color: #666; margin-bottom: 5px;">O seu GPS está a guiar os seus colegas.</p>
                   <span style="font-size: 10px; color: var(--primary); font-weight: 600;">${res.totalGuias || 1} guia(s) conectado(s)</span>
                   <button onclick="abdicarSerGuia()" class="btn-solid" style="background: #ef4444; margin: 15px 0 0 0; padding: 8px; font-size: 12px;">Ajudando a comunidade (Parar)</button>
                </div>
            `;
        }
        // --- UI do Passageiro (com ETA Híbrido) ---
        else if (res.guiaAtivo && res.coordenadas) {
            // Recruitment: Require explicit consent, auto-volunteer removed.

            boxRadar.innerHTML = `
                <div style="text-align: left;">
                   <div style="display:flex; justify-content: space-between; align-items:center; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px;">
                      <strong style="color: var(--primary);"><span style="font-size: 14px;">📍</span> Radar ao Vivo</strong>
                      <span style="font-size: 10px; background: #ecfdf5; color: #065f46; padding: 3px 6px; border-radius: 4px;">${res.totalGuias || 1} guia(s)</span>
                   </div>
                   <div id="radar-eta-slot" style="min-height: 60px; display: flex; align-items: center; justify-content: center;">
                      <div><div class="loader" style="margin: 0 auto; width: 15px; height: 15px; border-width: 2px;"></div><p style="font-size: 10px; text-align: center; margin-top: 5px; color: #666;">A calcular ETA...</p></div>
                   </div>
                   <button onclick="atualizarRadarDinamico()" class="btn-text" style="width: 100%; text-align: center; padding: 8px 0 0 0; margin-top: 5px; font-size: 11px;">🔄 Atualizar Agora</button>
                </div>
            `;

            // Fetch posição do passageiro e chamar ETA Híbrido
            _buscarETAHibrido(res.coordenadas);
        }
        // --- Radar Inativo (sem guias) ---
        else {
            // Recruitment: Require explicit consent, auto-volunteer removed.

            boxRadar.innerHTML = `
                <div style="text-align: center;">
                   <div style="font-size: 30px; margin-bottom: 10px; filter: grayscale(100%); opacity: 0.5;">📡</div>
                   <h4 style="color: #666; margin: 0 0 5px 0;">Radar Inativo</h4>
                   <p style="font-size: 11px; color: #999; margin-bottom: 15px;">A tentar ligar ao radar comunitário...</p>
                   <button onclick="solicitarSerGuia()" class="btn-solid" style="background: var(--primary); margin: 0; padding: 8px; font-size: 12px;">Seja o Guia (Ligar GPS)</button>
                </div>
            `;
        }
    } catch (e) {
        // Silencioso
    }
}

/**
 * Busca posição do passageiro via Geolocation e chama calcularETAHibrido.
 * Renderiza o resultado no slot #radar-eta-slot com badge de método.
 */
function _buscarETAHibrido(coordenadasBus) {
    const etaSlot = document.getElementById('radar-eta-slot');
    if (!etaSlot) return;

    if (!navigator.geolocation) {
        _renderizarETAFallbackSemGPS(etaSlot, coordenadasBus);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (posPassageiro) {
            const latEst = posPassageiro.coords.latitude;
            const lngEst = posPassageiro.coords.longitude;

            apiCall("calcularETAHibrido", {
                latBus: coordenadasBus.lat,
                lngBus: coordenadasBus.lng,
                latEstudante: latEst,
                lngEstudante: lngEst
            }).then(function (resEta) {
                if (!resEta || !resEta.sucesso) {
                    // Fallback local se API falhar
                    const distLocal = calcularDistanciaHaversine(latEst, lngEst, coordenadasBus.lat, coordenadasBus.lng);
                    _renderizarETANoSlot(etaSlot, distLocal, calcularETA(distLocal), "HAVERSINE_FALLBACK", coordenadasBus.ts);
                    return;
                }
                const etaTexto = resEta.etaMinutos <= 2 ? "A chegar!" : `~ ${resEta.etaMinutos} min`;
                _renderizarETANoSlot(etaSlot, resEta.distanciaKm, etaTexto, resEta.metodo, coordenadasBus.ts);
            }).catch(function () {
                const distLocal = calcularDistanciaHaversine(latEst, lngEst, coordenadasBus.lat, coordenadasBus.lng);
                _renderizarETANoSlot(etaSlot, distLocal, calcularETA(distLocal), "HAVERSINE_FALLBACK", coordenadasBus.ts);
            });
        },
        function () {
            _renderizarETAFallbackSemGPS(etaSlot, coordenadasBus);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
}

/**
 * Renderiza ETA com badge de método no slot.
 */
function _renderizarETANoSlot(slot, distKm, etaTexto, metodo, tsBus) {
    const tempoAtras = calcularTempoRelativo(tsBus);
    let badgeHTML = '';
    if (metodo === 'MAPS_API' || metodo === 'MAPS_CACHE') {
        badgeHTML = '<span style="font-size: 9px; background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-weight: 600;">⚡ Tempo Real (Google)</span>';
    } else {
        badgeHTML = '<span style="font-size: 9px; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 600;">📍 Estimativa Matemática</span>';
    }

    const distFormatada = typeof distKm === 'number' ? distKm.toFixed(1) : distKm;

    slot.innerHTML = `
        <div style="width: 100%;">
           <div style="display:flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="font-size: 12px; color: #666;">Distância:</span>
              <strong style="font-size: 12px;">${distFormatada} km</strong>
           </div>
           <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 12px; color: #666;">Chega em:</span>
              <strong style="font-size: 14px; color: var(--accent);">${etaTexto}</strong>
           </div>
           <div style="display:flex; justify-content: space-between; align-items: center;">
              ${badgeHTML}
              <span style="font-size: 10px; color: #999;">Atualizado: ${tempoAtras}</span>
           </div>
        </div>
    `;
}

/**
 * Fallback quando GPS do passageiro não está disponível.
 */
function _renderizarETAFallbackSemGPS(slot, coordenadasBus) {
    const tempoAtras = calcularTempoRelativo(coordenadasBus.ts);
    slot.innerHTML = `
        <div style="text-align: center; width: 100%;">
           <h4 style="color: var(--primary); margin: 0 0 5px 0; font-size: 13px;">📍 Autocarro em Movimento</h4>
           <p style="font-size: 11px; color: #666; margin-bottom: 8px;">Ative a localização para ver distância e ETA.</p>
           <span style="font-size: 10px; color: #999;">Último sinal: ${tempoAtras}</span>
        </div>
    `;
}

async function solicitarSerGuia() {
    // GUARD: Desktop PCs should not attempt GPS guide broadcasting
    if (typeof isDesktop === 'function' && isDesktop()) {
        showToast('Funcionalidade de guia GPS disponível apenas em dispositivos móveis.', 'info');
        return;
    }

    // BLOQUEIO DE PRIVACIDADE: Aborta se o aluno desligou o GPS
    if (localStorage.getItem('MAESTRO_PREF_GPS') === 'false') return;

    showToast("A solicitar permissão ao servidor...", "loading");
    const boxRadar = document.getElementById('radar-dinamico-conteudo');
    if (boxRadar) boxRadar.innerHTML = `<div class="loader" style="margin: 0 auto;"></div>`;

    try {
        const res = await apiCall("solicitarCargoGuia", { idOnibus: onibusSelecionadoGPS, idEstudante: currentWalletId });
        if (res.sucesso) {
            iniciarTransmissaoGpsComoGuia();
        } else {
            showToast(res.erro, "warning");
            atualizarRadarDinamico();
        }
    } catch (e) {
        showToast("Erro ao contactar o servidor.", "error");
        atualizarRadarDinamico();
    }
}

async function iniciarTransmissaoGpsComoGuia() {
    if (!navigator.geolocation) {
        abdicarSerGuia();
        return;
    }

    // GUARD: On desktop with operator/admin profiles, bypass continuous
    // GPS telemetry to avoid console errors on hardware without GPS chips.
    if (isDesktop() && typeof currentPerfilOperador !== 'undefined' && currentPerfilOperador) {
        console.info('[Maestro] Desktop operator detected — GPS guide transmission bypassed.');
        showToast('GPS guia não disponível em modo desktop.', 'info');
        return;
    }

    // Evitar dupla inicialização
    if (idIntervaloGPS) return;

    try {
        if ('wakeLock' in navigator) {
            wakeLockAtivo = await navigator.wakeLock.request('screen');
        }

        navigator.geolocation.getCurrentPosition(
            function (pos) {
                enviarCoordenadaSegura(pos.coords.latitude, pos.coords.longitude);

                if (idIntervaloGPS) clearInterval(idIntervaloGPS);
                idIntervaloGPS = setInterval(() => {
                    navigator.geolocation.getCurrentPosition(
                        p => enviarCoordenadaSegura(p.coords.latitude, p.coords.longitude),
                        e => console.warn("GPS falhou a leitura.")
                    );
                }, 120000);

                // Silencioso: atualiza radar sem toast
                atualizarRadarDinamico();
            },
            function (err) {
                // GPS negado silenciosamente — não prejudica UX do passageiro
                abdicarSerGuia();
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
        );
    } catch (err) {
        abdicarSerGuia();
    }
}

function enviarCoordenadaSegura(lat, lng) {
    if (!onibusSelecionadoGPS || !currentWalletId) return;

    apiCall("atualizarGPSOnibus", {
        idOnibus: onibusSelecionadoGPS,
        idEstudante: currentWalletId,
        lat: lat,
        lng: lng
    }).then(res => {
        if (res && !res.sucesso) {
            console.warn("Servidor rejeitou o GPS (Timeout ou Roubo): " + res.erro);
            pararTransmissaoGpsE_Radar();
            atualizarRadarDinamico();
        }
    }).catch(e => {
        // Silencioso
    });
}

async function abdicarSerGuia() {
    pararTransmissaoGpsE_Radar(false);
    showToast("A libertar GPS...", "loading");
    try {
        await apiCall("abdicarCargoGuia", { idOnibus: onibusSelecionadoGPS, idEstudante: currentWalletId });
        showToast("Transmissão encerrada com segurança.", "info");
        atualizarRadarDinamico();
    } catch (e) {
        atualizarRadarDinamico();
    }
}

function pararTransmissaoGpsE_Radar(matarRadarTambem = true) {
    if (idIntervaloGPS) { clearInterval(idIntervaloGPS); idIntervaloGPS = null; }
    if (matarRadarTambem && idIntervaloRadar) { clearInterval(idIntervaloRadar); idIntervaloRadar = null; }
    if (wakeLockAtivo) { wakeLockAtivo.release().then(() => wakeLockAtivo = null); }
}

let mapInstance = null;

async function inicializarMapaMobilidade(dadosViagem) {
    const container = document.getElementById('mapa-paradas-container');
    if (!container) return;

    container.style.display = 'block';

    if (mapInstance !== null) {
        mapInstance.off();
        mapInstance.remove();
        mapInstance = null;
    }

    // Default coordinate for Ceará-Mirim or use the first stop's coordinates
    let centerLat = -5.6322;
    let centerLng = -35.4267;

    if (dadosViagem.paradas && dadosViagem.paradas.length > 0) {
        centerLat = dadosViagem.paradas[0].LATITUDE;
        centerLng = dadosViagem.paradas[0].LONGITUDE;
    }

    mapInstance = L.map('mapa-paradas-container', { zoomControl: false }).setView([centerLat, centerLng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance);

    // Apply Progressive UI States
    const estado = dadosViagem.estadoRadar || "AGUARDANDO";
    const statusBar = document.getElementById('radar-status-bar');
    const statusText = document.getElementById('radar-status-text');

    if (statusBar && statusText) {
        if (estado === "AGUARDANDO") {
            statusBar.style.background = "#6B7280";
            statusBar.style.color = "white";
            statusText.textContent = "🕒 Fase de Planeamento";
        } else if (estado === "PREPARANDO") {
            statusBar.style.background = "#F59E0B";
            statusBar.style.color = "white";
            statusText.textContent = "⚙️ Autocarros em Preparação";
        } else if (estado === "EM_OPERACAO") {
            statusBar.style.background = "#10B981";
            statusBar.style.color = "white";
            statusText.textContent = "🚌 Operação em Tempo Real";
        } else {
            statusBar.style.background = "#fca5a5";
            statusBar.style.color = "#991b1b";
            statusText.textContent = "Fora de Serviço";
        }
    }

    if (dadosViagem.geojson_url) {
        try {
            const response = await fetch(dadosViagem.geojson_url);
            if (response.ok) {
                const geojsonData = await response.json();
                const routeLayer = L.geoJSON(geojsonData, {
                    style: { color: '#0A3D6B', weight: 4 },
                    filter: function (feature) {
                        // Prevent Leaflet crash if export tool generated a null geometry
                        if (!feature.geometry || !feature.geometry.coordinates) {
                            console.warn("🛡️ [PWA] Invalid GeoJSON feature ignored:", feature);
                            return false; // Skip this feature
                        }
                        // HOT FIX: Only allow LineString or MultiLineString, skip Points
                        if (feature.geometry.type !== 'LineString' && feature.geometry.type !== 'MultiLineString') {
                            return false;
                        }
                        return true; // Keep valid features
                    }
                }).addTo(mapInstance);

                // Adjust map bounds to the route
                mapInstance.fitBounds(routeLayer.getBounds());
            }
        } catch (error) {
            console.error("Erro ao carregar GeoJSON da rota:", error);
        }
    }

    if (dadosViagem.paradas && dadosViagem.paradas.length > 0) {
        dadosViagem.paradas.forEach(parada => {
            const tipoStr = String(parada.TIPO_PARADA || "Secundaria").toUpperCase().trim();
            let popupContent = `<b>${parada.NOME_PARADA}</b><br><span style="font-size:10px; color:gray;">${tipoStr}</span>`;

            if (estado === "EM_OPERACAO") {
                const maxCapacidade = 50; // Approximated default if unknown
                const lotacaoReal = (maxCapacidade - dadosViagem.vagasRestantes) > 0 ? (maxCapacidade - dadosViagem.vagasRestantes) : 0;
                const ocupacaoPct = Math.min(100, Math.round((lotacaoReal / maxCapacidade) * 100));
                const corLota = ocupacaoPct > 90 ? 'red' : (ocupacaoPct > 50 ? 'orange' : 'green');

                popupContent += `
                    <br>Autocarro: ${dadosViagem.placa || ''}
                    <br><span style="font-size: 11px;">ETA: (Calculando ao vivo)</span>
                    <div style="margin-top: 5px; width: 150px;">
                        <span style="font-size: 10px; display:block; margin-bottom: 2px;">Lotação: ${ocupacaoPct}%</span>
                        <div style="width: 100%; background: #ddd; border-radius: 4px; height: 8px;">
                            <div style="width: ${ocupacaoPct}%; background: ${corLota}; height: 100%; border-radius: 4px; transition: width 0.3s ease;"></div>
                        </div>
                    </div>`;
            } else {
                popupContent += `<br><br><span style="color:#F59E0B; font-weight:bold; font-size:11px;">Embarque ainda fechado.</span>`;
            }

            if (tipoStr === "PRINCIPAL") {
                L.marker([parada.LATITUDE, parada.LONGITUDE])
                    .addTo(mapInstance)
                    .bindPopup(popupContent);
            } else {
                const secondaryIcon = L.divIcon({
                    className: 'custom-sec-marker',
                    html: `<svg viewBox="0 0 24 24" width="20" height="20" fill="#fef08a" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.4));">
                             <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                             <circle cx="12" cy="10" r="3" fill="#ea580c"></circle>
                           </svg>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 20],
                    popupAnchor: [0, -18]
                });

                L.marker([parada.LATITUDE, parada.LONGITUDE], { icon: secondaryIcon })
                    .addTo(mapInstance)
                    .bindPopup(popupContent);
            }
        });
    }

    if (estado === "EM_OPERACAO") {
        // Create a visual indicator that bus is operating even if GPS hasn't caught up
        if (!busMarker && centerLat && centerLng) {
            atualizarPosicaoOnibusMapa(centerLat, centerLng);
        }
    } else {
        if (busMarker && mapInstance) {
            mapInstance.removeLayer(busMarker);
            busMarker = null;
        }
    }
}

function atualizarPosicaoOnibusMapa(lat, lng) {
    if (typeof mapInstance === 'undefined' || !mapInstance) return;

    if (busMarker === null) {
        busMarker = L.marker([lat, lng], { icon: busIcon }).addTo(mapInstance);
    } else {
        if (busMarker.slideTo) {
            busMarker.slideTo([lat, lng], { duration: 2500, keepAtCenter: false });
        } else {
            busMarker.setLatLng([lat, lng]);
        }
    }
}

let userLocationMarker = null;

function centralizarMapaEmMim() {
    if (!navigator.geolocation) {
        showToast("O seu dispositivo não suporta geolocalização.", "error");
        return;
    }

    showToast("A obter a sua localização...", "loading");

    navigator.geolocation.getCurrentPosition(
        function (pos) {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            if (mapInstance) {
                mapInstance.setView([lat, lng], 16);

                if (userLocationMarker === null) {
                    const userIcon = L.divIcon({
                        className: 'user-location-marker',
                        html: '<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8); animation: pulse 2s infinite;"></div>',
                        iconSize: [22, 22],
                        iconAnchor: [11, 11]
                    });
                    userLocationMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapInstance);
                } else {
                    userLocationMarker.setLatLng([lat, lng]);
                }
            }
            showToast("Localização atualizada.", "success");
        },
        function (err) {
            showToast("Não foi possível obter a sua localização.", "error");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// ========================================================================
// GLOBAL: Resize listener for Leaflet tile integrity on desktop
// Prevents tile tearing when the browser window is maximized/restored.
// ========================================================================
window.addEventListener('resize', () => {
    if (typeof mapInstance !== 'undefined' && mapInstance !== null) {
        mapInstance.invalidateSize();
    }
});
