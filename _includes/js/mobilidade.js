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
    html: '<div class="bus-marker-dot">🚌</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

// Default city coordinates (Ceará-Mirim)
const CIDADE_DEFAULT_LAT = -5.6322;
const CIDADE_DEFAULT_LNG = -35.4267;

function setRadarStatusMobilidade(estado, texto) {
    const statusBar = document.getElementById('radar-status-bar');
    const statusText = document.getElementById('radar-status-text');
    if (!statusBar || !statusText) return;
    statusBar.classList.remove('is-standby', 'is-preparing', 'is-live', 'is-offline');
    statusBar.classList.add(`is-${estado}`);
    statusText.textContent = texto;
}

function classeLotacaoMobilidade(percentual) {
    const pctSeguro = Math.max(0, Math.min(100, Number(percentual) || 0));
    const bucket = Math.round(pctSeguro / 10) * 10;
    const nivel = pctSeguro > 90 ? "is-high" : (pctSeguro > 50 ? "is-medium" : "is-low");
    return `${nivel} occupancy-w-${bucket}`;
}

function normalizarArrayMobilidade(obj) {
    if (Array.isArray(obj)) return obj;
    if (!obj || typeof obj !== 'object') return [];

    const chaves = Object.keys(obj);
    if (chaves.length === 0) return [];

    const chavesNumericas = chaves.filter(k => /^\d+$/.test(k));
    if (chavesNumericas.length === chaves.length) {
        return chavesNumericas
            .sort((a, b) => Number(a) - Number(b))
            .map(k => obj[k])
            .filter(Boolean);
    }

    if (Array.isArray(obj.values)) return obj.values;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.lista)) return obj.lista;

    return [];
}

function normalizarCoordenadasRadar(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;

    const lat = Number(obj.lat ?? obj.latitude ?? obj.LATITUDE);
    const lng = Number(obj.lng ?? obj.longitude ?? obj.LONGITUDE);
    const ts = Number(obj.ts ?? obj.timestamp ?? Date.now());

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

    return { lat, lng, ts: Number.isFinite(ts) ? ts : Date.now() };
}

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
    container.classList.remove('hidden');

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
        statusBar.classList.remove('is-preparing', 'is-live', 'is-offline');
        statusBar.classList.add('is-standby');
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
    tripData.paradas = normalizarArrayMobilidade(tripData.paradas);

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

    if (painelMob) painelMob.classList.remove('hidden');
    if (painelSucesso) painelSucesso.innerHTML = '';

    if (containerLista) {
        containerLista.innerHTML = `<div class="loader radar-list-loader"></div><p class="radar-list-loading-text">A procurar autocarros...</p>`;
        containerLista.classList.remove('hidden');
    }

    try {
        if (painelMob) painelMob.scrollIntoView({ behavior: 'smooth', block: 'start' });

        const res = await apiCall("getViagensDisponiveisPortal", { idEstudante: currentWalletId });
        console.warn("🔍 [DEBUG PWA] Raw response from getViagensDisponiveisPortal:");
        console.dir(res);

        if (!res.sucesso) {
            if (containerLista) containerLista.innerHTML = `<p class="mobility-error-text">Erro: ${res.erro}</p>`;
            return;
        }

        if (res.emViagem) {
            if (containerLista) containerLista.classList.add('hidden');
            onibusSelecionadoGPS = res.dadosViagem.idOnibus;
            abrirPainelViagem();
            return;
        }

        const viagens = normalizarArrayMobilidade(res.viagens);

        if (viagens.length === 0) {
            if (busMarker && typeof mapInstance !== 'undefined' && mapInstance) {
                mapInstance.removeLayer(busMarker);
            }
            busMarker = null;

            let msgEmpty = "Nenhum embarque previsto para agora.";
            if (res.statusOperacao === "FORA_DE_HORARIO") {
                msgEmpty = "<b>Fora do Horário de Embarque.</b><br>Os autocarros só aparecem aqui minutos antes da hora de partida da sua rota.";
            } else if (res.statusOperacao === "SEM_FROTA") {
                msgEmpty = "Não há autocarros ativos associados à sua rota neste momento.";
            } else if (res.statusOperacao === "ESTUDANTE_INATIVO") {
                msgEmpty = "A sua carteira não está ativa para embarque neste semestre.";
            } else if (res.statusOperacao === "DOCUMENTOS_PENDENTES") {
                msgEmpty = "A sua documentação ainda não permite embarque neste semestre.";
            }
            if (containerLista) containerLista.innerHTML = `<div class="mobility-empty-warning">${msgEmpty}</div>`;
            return;
        }

        let html = `<p class="mobility-list-hint">Selecione o seu autocarro para garantir lugar:</p>`;

        // Armazenar na window para acesso no check-in
        window.lastViagens = viagens;

        viagens.forEach((v, index) => {
            let checkinArea = "";
            let statusVagas = "";

            if (v.estadoRadar === "EM_OPERACAO") {
                const labelLota = v.vagasRestantes > 0 ? `<span class="mobility-seats is-available">${v.vagasRestantes} vagas livres</span>` : `<span class="mobility-seats is-full">LOTADO</span>`;
                const btnDisable = v.vagasRestantes <= 0 ? "disabled" : "";
                const btnState = v.vagasRestantes <= 0 ? " is-disabled" : "";
                statusVagas = labelLota;
                checkinArea = `<button class="hide-on-desktop mobility-checkin-button${btnState}" ${btnDisable} onclick="confirmarEmbarque('${v.id}')">FAZER CHECK-IN</button>`;
            } else {
                statusVagas = `<span class="mobility-seats is-closed">Embarque fechado (Capacidade: ${v.vagasRestantes})</span>`;
                checkinArea = `<button class="hide-on-desktop mobility-checkin-button is-disabled" disabled>AGUARDE...</button>`;
            }

            const cardState = index === 0 ? " is-primary" : " is-secondary";

            html += `
<div class="mobility-trip-card${cardState}">
  <div class="mobility-trip-header">
     <strong class="mobility-trip-title">🚌 ${v.rota}</strong>
     <span class="mobility-trip-time">${v.horario}</span>
  </div>
  <div class="mobility-trip-status">${statusVagas}</div>
  <div class="mobility-trip-actions">
     <button class="btn-solid mobility-map-button" onclick="abrirMapaDaViagem('${v.id}')">VER MAPA 🗺️</button>
     ${checkinArea}
  </div>
</div>`;
        });

        if (containerLista) containerLista.innerHTML = html;

    } catch (e) {
        if (containerLista) containerLista.innerHTML = `<p class="mobility-error-text">Não foi possível atualizar a logística.</p>`;
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
            const paradas = normalizarArrayMobilidade(tripData && tripData.paradas);
            if (tripData && tripData.estadoRadar === "EM_OPERACAO" && paradas.length > 0) {
                let isNearStop = false;
                for (let i = 0; i < paradas.length; i++) {
                    const dist = calcularDistanciaHaversine(lat, lng, paradas[i].LATITUDE, paradas[i].LONGITUDE);
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
      <div class="radar-trip-confirmed">
         <h3 class="radar-trip-title">✅ Check-in Confirmado</h3>
         <p class="radar-trip-text">O seu lugar está garantido. Acompanhe a viagem no radar abaixo.</p>
         <div id="radar-dinamico-conteudo" class="radar-dynamic-box">
            <div class="loader radar-inline-loader"></div>
            <p class="radar-inline-loading-text">A sincronizar radar...</p>
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
        const coordenadasRadar = normalizarCoordenadasRadar(res && res.coordenadas);

        if (coordenadasRadar) {
            atualizarPosicaoOnibusMapa(coordenadasRadar.lat, coordenadasRadar.lng);
        }

        // --- Injetar CSS de animação ---
        // --- UI do Guia (Transmissor Ativo) ---
        if (res.isGuia) {
            boxRadar.innerHTML = `
                <div class="radar-guide-card">
                   <div class="radar-guide-icon">📡</div>
                   <h4 class="radar-guide-title">Transmissão Ativa</h4>
                   <p class="radar-guide-text">O seu GPS está a guiar os seus colegas.</p>
                   <span class="radar-guide-count">${res.totalGuias || 1} guia(s) conectado(s)</span>
                   <button onclick="abdicarSerGuia()" class="btn-solid radar-stop-guide-button">Ajudando a comunidade (Parar)</button>
                </div>
            `;
        }
        // --- UI do Passageiro (com ETA Híbrido) ---
        else if (res.guiaAtivo && coordenadasRadar) {
            // Recruitment: Require explicit consent, auto-volunteer removed.

            boxRadar.innerHTML = `
                <div class="radar-live-card">
                   <div class="radar-live-header">
                      <strong class="radar-live-title"><span class="radar-live-pin">📍</span> Radar ao Vivo</strong>
                      <span class="radar-guide-badge">${res.totalGuias || 1} guia(s)</span>
                   </div>
                   <div id="radar-eta-slot" class="radar-eta-slot">
                      <div><div class="loader radar-eta-loader"></div><p class="radar-eta-loading-text">A calcular ETA...</p></div>
                   </div>
                   <button onclick="atualizarRadarDinamico()" class="btn-text radar-refresh-button">🔄 Atualizar Agora</button>
                </div>
            `;

            // Fetch posição do passageiro e chamar ETA Híbrido
            _buscarETAHibrido(coordenadasRadar);
        }
        // --- Radar Inativo (sem guias) ---
        else {
            // Recruitment: Require explicit consent, auto-volunteer removed.

            boxRadar.innerHTML = `
                <div class="radar-inactive-card">
                   <div class="radar-inactive-icon">📡</div>
                   <h4 class="radar-inactive-title">Radar Inativo</h4>
                   <p class="radar-inactive-text">A tentar ligar ao radar comunitário...</p>
                   <button onclick="solicitarSerGuia()" class="btn-solid radar-start-guide-button">Seja o Guia (Ligar GPS)</button>
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
    const coordsBus = normalizarCoordenadasRadar(coordenadasBus);
    if (!coordsBus) return;

    if (!navigator.geolocation) {
        _renderizarETAFallbackSemGPS(etaSlot, coordsBus);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (posPassageiro) {
            const latEst = posPassageiro.coords.latitude;
            const lngEst = posPassageiro.coords.longitude;

            apiCall("calcularETAHibrido", {
                latBus: coordsBus.lat,
                lngBus: coordsBus.lng,
                latEstudante: latEst,
                lngEstudante: lngEst
            }).then(function (resEta) {
                if (!resEta || !resEta.sucesso) {
                    // Fallback local se API falhar
                    const distLocal = calcularDistanciaHaversine(latEst, lngEst, coordsBus.lat, coordsBus.lng);
                    _renderizarETANoSlot(etaSlot, distLocal, calcularETA(distLocal), "HAVERSINE_FALLBACK", coordsBus.ts);
                    return;
                }
                const etaTexto = resEta.etaMinutos <= 2 ? "A chegar!" : `~ ${resEta.etaMinutos} min`;
                _renderizarETANoSlot(etaSlot, resEta.distanciaKm, etaTexto, resEta.metodo, coordsBus.ts);
            }).catch(function () {
                const distLocal = calcularDistanciaHaversine(latEst, lngEst, coordsBus.lat, coordsBus.lng);
                _renderizarETANoSlot(etaSlot, distLocal, calcularETA(distLocal), "HAVERSINE_FALLBACK", coordsBus.ts);
            });
        },
        function () {
            _renderizarETAFallbackSemGPS(etaSlot, coordsBus);
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
        badgeHTML = '<span class="eta-method-badge is-google">⚡ Tempo Real (Google)</span>';
    } else {
        badgeHTML = '<span class="eta-method-badge is-math">📍 Estimativa Matemática</span>';
    }

    const distFormatada = typeof distKm === 'number' ? distKm.toFixed(1) : distKm;

    slot.innerHTML = `
        <div class="eta-box">
           <div class="eta-row eta-row-spaced">
              <span class="eta-label">Distância:</span>
              <strong class="eta-value">${distFormatada} km</strong>
           </div>
           <div class="eta-row eta-row-main">
              <span class="eta-label">Chega em:</span>
              <strong class="eta-value eta-value-accent">${etaTexto}</strong>
           </div>
           <div class="eta-row">
              ${badgeHTML}
              <span class="eta-updated">Atualizado: ${tempoAtras}</span>
           </div>
        </div>
    `;
}

/**
 * Fallback quando GPS do passageiro não está disponível.
 */
function _renderizarETAFallbackSemGPS(slot, coordenadasBus) {
    const coordsBus = normalizarCoordenadasRadar(coordenadasBus);
    if (!coordsBus) return;
    const tempoAtras = calcularTempoRelativo(coordsBus.ts);
    slot.innerHTML = `
        <div class="eta-fallback">
           <h4 class="eta-fallback-title">📍 Autocarro em Movimento</h4>
           <p class="eta-fallback-text">Ative a localização para ver distância e ETA.</p>
           <span class="eta-updated">Último sinal: ${tempoAtras}</span>
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
    if (boxRadar) boxRadar.innerHTML = `<div class="loader loader-center"></div>`;

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
    dadosViagem = dadosViagem || {};
    const paradasViagem = normalizarArrayMobilidade(dadosViagem.paradas);

    container.classList.remove('hidden');

    if (mapInstance !== null) {
        mapInstance.off();
        mapInstance.remove();
        mapInstance = null;
    }

    // Default coordinate for Ceará-Mirim or use the first stop's coordinates
    let centerLat = -5.6322;
    let centerLng = -35.4267;

    if (paradasViagem.length > 0) {
        centerLat = paradasViagem[0].LATITUDE;
        centerLng = paradasViagem[0].LONGITUDE;
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
            statusBar.classList.remove('is-preparing', 'is-live', 'is-offline');
            statusBar.classList.add('is-standby');
            statusText.textContent = "🕒 Fase de Planeamento";
        } else if (estado === "PREPARANDO") {
            statusBar.classList.remove('is-standby', 'is-live', 'is-offline');
            statusBar.classList.add('is-preparing');
            statusText.textContent = "⚙️ Autocarros em Preparação";
        } else if (estado === "EM_OPERACAO") {
            statusBar.classList.remove('is-standby', 'is-preparing', 'is-offline');
            statusBar.classList.add('is-live');
            statusText.textContent = "🚌 Operação em Tempo Real";
        } else {
            statusBar.classList.remove('is-standby', 'is-preparing', 'is-live');
            statusBar.classList.add('is-offline');
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
                        if (!feature.geometry || normalizarArrayMobilidade(feature.geometry.coordinates).length === 0) {
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

    if (paradasViagem.length > 0) {
        paradasViagem.forEach(parada => {
            const tipoStr = String(parada.TIPO_PARADA || "Secundaria").toUpperCase().trim();
            let popupContent = `<b>${parada.NOME_PARADA}</b><br><span class="map-popup-type">${tipoStr}</span>`;

            if (estado === "EM_OPERACAO") {
                const maxCapacidade = 50; // Approximated default if unknown
                const lotacaoReal = (maxCapacidade - dadosViagem.vagasRestantes) > 0 ? (maxCapacidade - dadosViagem.vagasRestantes) : 0;
                const ocupacaoPct = Math.min(100, Math.round((lotacaoReal / maxCapacidade) * 100));
                const classeLotacao = classeLotacaoMobilidade(ocupacaoPct);

                popupContent += `
                    <br>Autocarro: ${dadosViagem.placa || ''}
                    <br><span class="map-popup-eta">ETA: (Calculando ao vivo)</span>
                    <div class="map-popup-occupancy">
                        <span class="map-popup-occupancy-label">Lotação: ${ocupacaoPct}%</span>
                        <div class="map-popup-occupancy-track">
                            <div class="map-popup-occupancy-fill ${classeLotacao}"></div>
                        </div>
                    </div>`;
            } else {
                popupContent += `<br><br><span class="map-popup-closed">Embarque ainda fechado.</span>`;
            }

            if (tipoStr === "PRINCIPAL") {
                L.marker([parada.LATITUDE, parada.LONGITUDE])
                    .addTo(mapInstance)
                    .bindPopup(popupContent);
            } else {
                const secondaryIcon = L.divIcon({
                    className: 'custom-sec-marker',
                    html: `<svg viewBox="0 0 24 24" width="20" height="20" fill="#fef08a" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="secondary-stop-icon">
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
    const coords = normalizarCoordenadasRadar({ lat, lng });
    if (!coords) return;

    if (busMarker === null) {
        busMarker = L.marker([coords.lat, coords.lng], { icon: busIcon }).addTo(mapInstance);
    } else {
        if (busMarker.slideTo) {
            busMarker.slideTo([coords.lat, coords.lng], { duration: 2500, keepAtCenter: false });
        } else {
            busMarker.setLatLng([coords.lat, coords.lng]);
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
                        html: '<div class="user-location-dot"></div>',
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
