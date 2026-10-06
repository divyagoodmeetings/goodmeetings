document.addEventListener('DOMContentLoaded', () => {
    handleSplashTransitions();
});

function handleSplashTransitions() {
    const splashScreen = document.getElementById('splash-screen');
    const mainContent = document.getElementById('main-content');
    
    // If on a page without a splash screen, show content immediately
    if (!splashScreen) {
        if (mainContent) {
            mainContent.classList.remove('hidden');
            mainContent.classList.add('visible');
        }
        document.body.style.overflow = 'auto';
        const chatbotContainer = document.querySelector('.chatbot-container');
        if (chatbotContainer) {
            chatbotContainer.classList.add('visible');
        }
        return;
    }
    
    const splashIcon = document.getElementById('splash-icon');
    const splashText = document.getElementById('splash-text');
    const splashRipple = document.getElementById('splash-ripple');

    // Keep body unscrollable during splash screen
    document.body.style.overflow = 'hidden';

    // 1. Fluid drop impact at ~680ms: trigger ripple wave, pop in 'g' icon, and hide drop
    setTimeout(() => {
        const drop = document.querySelector('.liquid-drop');
        if (drop) {
            drop.style.opacity = '0';
            drop.style.visibility = 'hidden';
        }
        if (splashRipple) splashRipple.classList.add('active');
        if (splashIcon) splashIcon.classList.add('visible');
    }, 680);

    // 2. Reveal GOOD MEETINGS wordmark smoothly
    setTimeout(() => {
        if (splashText) splashText.classList.add('visible');
    }, 950);

    // 3. Smoothly fade out splash screen and reveal main website content
    setTimeout(() => {
        splashScreen.classList.add('fade-out');
        
        if (mainContent) {
            mainContent.classList.remove('hidden');
            void mainContent.offsetWidth; // trigger reflow
            mainContent.classList.add('visible');
        }
        
        document.body.style.overflow = 'auto';

        // Reveal AI Chatbot widget
        const chatbotContainer = document.querySelector('.chatbot-container');
        if (chatbotContainer) {
            setTimeout(() => {
                chatbotContainer.classList.add('visible');
            }, 400);
        }

        setTimeout(() => {
            splashScreen.remove();
        }, 850);
        
    }, 1850);
}

// Robust JS-based animation to ensure masks update on all browsers
function animatePath(path, startOffset, endOffset, duration, callback) {
    let start = null;
    function step(timestamp) {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        
        // ease-in-out curve
        const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const currentOffset = startOffset - (startOffset - endOffset) * ease;
        
        path.setAttribute('stroke-dashoffset', currentOffset);
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else if (callback) {
            callback();
        }
    }
    window.requestAnimationFrame(step);
}

// Mobile Menu Logic
document.addEventListener('DOMContentLoaded', () => {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');
    const navAuth = document.getElementById('nav-auth');

    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('mobile-active');
            navAuth.classList.toggle('mobile-active');
            
            // Toggle hamburger to X icon
            if (navLinks.classList.contains('mobile-active')) {
                mobileBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
                document.body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
            } else {
                mobileBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
                document.body.style.overflow = 'auto';
            }
        });
    }

    // Handle mobile accordion dropdowns
    const navItems = document.querySelectorAll('.nav-item.has-dropdown');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Only trigger JS accordion if we are in mobile view
            if (window.innerWidth <= 900) {
                // Check if the click was on the link itself (not inside the dropdown)
                if (e.target.closest('a') && !e.target.closest('.dropdown')) {
                    e.preventDefault(); // Prevent navigating away
                    
                    // Close others
                    navItems.forEach(otherItem => {
                        if (otherItem !== item) {
                            otherItem.classList.remove('mobile-dropdown-active');
                        }
                    });
                    
                    // Toggle current
                    item.classList.toggle('mobile-dropdown-active');
                }
            }
        });
    });

    // Initialize the complex 3D animated waves
    initDynamicWaves();

    // Initialize Three Pillars Platform interactive cards
    initPlatformPillarsInteractive();
});

// ==========================================
// THREE PILLARS PLATFORM INTERACTIVE LOGIC
// ==========================================
function initPlatformPillarsInteractive() {
    const isoLayers = document.querySelectorAll('.iso-layer-card');
    const isoTags = document.querySelectorAll('.iso-tag-callout');
    const detailPanes = document.querySelectorAll('.pillar-detail-pane');

    if (!isoLayers.length && !detailPanes.length) return;

    function activatePillar(pillarId) {
        let normId = pillarId;
        if (normId.includes('conversation') || normId === '1') normId = '01';
        if (normId.includes('agents') || normId === '2') normId = '02';
        if (normId.includes('observability') || normId === '3') normId = '03';

        // Update 3D Isometric Layers on Left
        isoLayers.forEach(layer => {
            const layerPillar = layer.getAttribute('data-pillar');
            layer.classList.toggle('active', layerPillar === normId);
        });

        // Update Isometric Callout Tags on Left
        isoTags.forEach(tag => {
            const tagPillar = tag.getAttribute('data-pillar');
            tag.classList.toggle('active', tagPillar === normId);
        });

        // Update Dynamic Detail Panes on Right
        detailPanes.forEach(pane => {
            const panePillar = pane.getAttribute('data-pillar');
            pane.classList.toggle('active', panePillar === normId);
        });
    }

    // Bind Isometric Layers on Left (Click & Hover)
    isoLayers.forEach(layer => {
        const pillarId = layer.getAttribute('data-pillar');
        layer.addEventListener('click', () => activatePillar(pillarId));
        layer.addEventListener('mouseenter', () => activatePillar(pillarId));
        layer.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activatePillar(pillarId);
            }
        });
    });

    // Bind Isometric Tags on Left (Click & Hover)
    isoTags.forEach(tag => {
        const pillarId = tag.getAttribute('data-pillar');
        tag.addEventListener('click', () => activatePillar(pillarId));
        tag.addEventListener('mouseenter', () => activatePillar(pillarId));
        tag.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activatePillar(pillarId);
            }
        });
    });
}

// ==========================================
// DYNAMIC 3D RIBBON WAVES (CANVAS-LIKE SVG)
// ==========================================
let wavePhaseOffset = 0;
const numWaveLines = 15;
let waveInstances = [];
let isAnimatingWaves = false;

function createWaveSet(container, purpleGradId, colorGradIds) {
    if (!container) return null;
    
    let leftPaths = [];
    let rightPaths = [];

    // Left (Purple) Paths
    for (let i = 0; i < numWaveLines; i++) {
        let path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', `url(#${purpleGradId})`);
        path.setAttribute('stroke-width', '1.3');
        
        let opacity = 0.25 + (1 - Math.abs((i / numWaveLines) - 0.5) * 2) * 0.55;
        path.setAttribute('opacity', opacity.toFixed(2));
        path.classList.add('wave-solid');
        
        leftPaths.push(path);
        container.appendChild(path);
    }

    // Right (Multi-color) Paths
    const numRightWaveLines = 26; 
    for (let i = 0; i < numRightWaveLines; i++) {
        let path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill', 'none');
        
        let gradId = colorGradIds[i % colorGradIds.length];
        path.setAttribute('stroke', `url(#${gradId})`);
        path.setAttribute('stroke-width', '1.8');
        
        let opacity = 0.35 + (1 - Math.abs((i / numRightWaveLines) - 0.5) * 2) * 0.6;
        path.setAttribute('opacity', opacity.toFixed(2));
        path.classList.add('wave-solid');
        
        rightPaths.push(path);
        container.appendChild(path);
    }

    const svgElement = container.closest('svg');
    const parentSection = container.closest('.hero-showcase-centerpiece') || container.closest('.hero');
    const orb = parentSection ? parentSection.querySelector('.hero-center-glow') : document.querySelector('.hero-center-glow');

    return {
        leftPaths,
        rightPaths,
        svgElement,
        orb
    };
}

function initDynamicWaves() {
    waveInstances = [];

    const heroContainer = document.getElementById('dynamic-waves-container');
    if (heroContainer) {
        const inst = createWaveSet(heroContainer, 'purple-wave', ['purple-wave', 'blue-wave', 'teal-wave', 'orange-wave']);
        if (inst) waveInstances.push(inst);
    }

    const cpContainer = document.getElementById('centerpiece-waves-container');
    if (cpContainer) {
        const inst = createWaveSet(cpContainer, 'purple-wave-cp', ['blue-wave-cp', 'teal-wave-cp', 'orange-wave-cp', 'magenta-wave-cp']);
        if (inst) waveInstances.push(inst);
    }

    if (waveInstances.length > 0 && !isAnimatingWaves) {
        isAnimatingWaves = true;
        requestAnimationFrame(animateDynamicWaves);
    }
}

function animateDynamicWaves() {
    const mainContent = document.getElementById('main-content');
    if (mainContent && mainContent.classList.contains('visible') && waveInstances.length > 0) {
        wavePhaseOffset -= 0.025; // Speed of the flow

        waveInstances.forEach(inst => {
            let centerPointY = 400;
            let pinchLeftX = 588;
            let pinchRightX = 812;

            if (inst.orb && inst.svgElement) {
                const orbRect = inst.orb.getBoundingClientRect();
                const svgRect = inst.svgElement.getBoundingClientRect();
                
                if (svgRect.height > 0 && svgRect.width > 0) {
                    const orbCenterY = (orbRect.top + orbRect.height / 2) - svgRect.top;
                    centerPointY = (orbCenterY / svgRect.height) * 800;

                    const orbCenterX = (orbRect.left + orbRect.width / 2) - svgRect.left;
                    const orbCenterInSvg = (orbCenterX / svgRect.width) * 1400;

                    // Match exact outer radius of orb (r=95 in 240px container)
                    const orbRadiusInSvg = ((orbRect.width * (95 / 240)) / svgRect.width) * 1400;

                    pinchLeftX = orbCenterInSvg - orbRadiusInSvg;
                    pinchRightX = orbCenterInSvg + orbRadiusInSvg;
                }
            }

            // Update Left Waves
            inst.leftPaths.forEach((path, i) => {
                let d = '';
                let phase = (i / numWaveLines) * Math.PI * 2 + wavePhaseOffset;
                let freq = 0.008 + (i * 0.0004);
                
                let endX = Math.round(pinchLeftX);
                for (let x = -100; x <= endX; x += 6) {
                    let env = Math.pow(Math.max(0, endX - x) / (endX + 100 || 1), 1.6) * 55; 
                    let y = centerPointY + Math.sin(x * freq + phase) * env;
                    d += (x === -100 ? 'M ' : 'L ') + x + ' ' + y;
                }
                path.setAttribute('d', d);
            });

            // Update Right Waves
            inst.rightPaths.forEach((path, i) => {
                let d = '';
                let phase = (i / inst.rightPaths.length) * Math.PI * 2 + wavePhaseOffset; 
                let baseFreq = 0.008 + (i % 4) * 0.0006; 
                let freq = baseFreq + (i * 0.00015);
                
                let startX = Math.round(pinchRightX);
                for (let x = startX; x <= 1500; x += 6) {
                    let env = Math.pow(Math.max(0, x - startX) / (1500 - startX || 1), 1.6) * 210; 
                    let y = centerPointY + Math.sin(x * freq + phase) * env;
                    d += (x === startX ? 'M ' : 'L ') + x + ' ' + y;
                }
                path.setAttribute('d', d);
            });
        });
    }

    requestAnimationFrame(animateDynamicWaves);
}

// ==========================================
// AI CHATBOT WIDGET LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('chatbot-container');
    const trigger = document.getElementById('chatbot-trigger');
    const windowModal = document.getElementById('chatbot-window');
    const closeBtn = document.getElementById('chatbot-close-btn');
    const minimizeBtn = document.getElementById('chatbot-minimize-btn');
    const clearBtn = document.getElementById('chatbot-clear-btn');
    const sendBtn = document.getElementById('chatbot-send-btn');
    const input = document.getElementById('chatbot-input');
    const messagesContainer = document.getElementById('chatbot-messages');
    const tooltip = document.getElementById('chatbot-tooltip');
    const tooltipClose = document.getElementById('tooltip-close');
    const micBtn = document.getElementById('chatbot-mic-btn');

    const dropdownTrigger = document.getElementById('chatbot-dropdown-trigger');
    const dropdownMenu = document.getElementById('chatbot-header-dropdown');

    if (!trigger || !windowModal) return;

    // Toggle Chatbot Window
    const toggleChat = (forceOpen) => {
        const isOpen = forceOpen !== undefined ? forceOpen : !windowModal.classList.contains('active');
        if (isOpen) {
            windowModal.classList.add('active');
            container.classList.add('active');
            if (tooltip) tooltip.classList.add('hidden');
            setTimeout(() => input?.focus(), 150);
        } else {
            windowModal.classList.remove('active');
            container.classList.remove('active');
            if (dropdownMenu) dropdownMenu.classList.remove('active');
        }
    };

    // Toggle Dropdown Menu
    if (dropdownTrigger && dropdownMenu) {
        dropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!dropdownMenu.contains(e.target) && e.target !== dropdownTrigger) {
                dropdownMenu.classList.remove('active');
            }
        });

        const dropdownLinks = dropdownMenu.querySelectorAll('.dropdown-item-link');
        dropdownLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                dropdownMenu.classList.remove('active');
                const action = link.getAttribute('data-action');

                if (action === 'about') {
                    sendMessage("What is Goodmeetings.ai?");
                } else if (action === 'overview') {
                    sendMessage("Can you give me a product overview?");
                } else if (action === 'demo') {
                    sendMessage("Book a Demo");
                }
            });
        });
    }

    trigger.addEventListener('click', () => toggleChat());

    if (closeBtn) {
        closeBtn.addEventListener('click', () => toggleChat(false));
    }

    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => toggleChat(false));
    }

    // Floating Tooltip events
    if (tooltip) {
        tooltip.addEventListener('click', (e) => {
            if (e.target !== tooltipClose) {
                toggleChat(true);
            }
        });
    }

    if (tooltipClose) {
        tooltipClose.addEventListener('click', (e) => {
            e.stopPropagation();
            tooltip.classList.add('hidden');
        });
    }

    // Clear Chat
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            messagesContainer.innerHTML = `
                <div class="welcome-banner">
                    <h5>Welcome to Goodmeetings AI</h5>
                    <p>Ask anything about our AI SDRs, transcriptions, integrations, or book a demo.</p>
                </div>
                <div class="chat-message bot-message">
                    <div class="msg-avatar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="12" rx="4"></rect><circle cx="9" cy="13" r="1" fill="currentColor"></circle><circle cx="15" cy="13" r="1" fill="currentColor"></circle></svg>
                    </div>
                    <div class="msg-body">
                        <div class="message-content">
                            Chat history cleared. How can I help you now?
                        </div>
                        <span class="message-time">Just now</span>
                    </div>
                </div>
                <div class="chatbot-chips-title">Suggested Prompts:</div>
                <div class="chatbot-chips" id="chatbot-chips">
                    <button class="chip-btn" data-query="Book a Demo">Book a Demo</button>
                    <button class="chip-btn" data-query="What is Goodmeetings?">What is Goodmeetings?</button>
                    <button class="chip-btn" data-query="AI SDR & Voice Agents">AI Agents</button>
                    <button class="chip-btn" data-query="Enterprise Pricing">Pricing</button>
                </div>
            `;
            attachChipListeners();
        });
    }

    // Attach Chip Listeners
    function attachChipListeners() {
        const chips = messagesContainer.querySelectorAll('.chip-btn');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                const query = chip.getAttribute('data-query');
                if (query) sendMessage(query);
            });
        });
    }
    attachChipListeners();

    // Send on button click
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            if (input.value.trim() !== '') {
                sendMessage(input.value.trim());
                input.value = '';
            }
        });
    }

    // Send on Enter keypress
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && input.value.trim() !== '') {
                sendMessage(input.value.trim());
                input.value = '';
            }
        });
    }

    const demoBtn = document.getElementById('chatbot-demo-btn');
    if (demoBtn) {
        demoBtn.addEventListener('click', () => {
            sendMessage("Book a Demo");
        });
    }

    const voiceBarBtn = document.getElementById('chatbot-voice-bar-btn');
    const voiceOverlay = document.getElementById('voice-active-overlay');
    const voiceStatusText = document.getElementById('voice-status-text');
    const voiceStopBtn = document.getElementById('voice-stop-btn');

    // Speech Assistant Voice Interaction Logic
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isListening = false;
    let isSpeaking = false;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListening = true;
            if (voiceBarBtn) voiceBarBtn.classList.add('listening');
            if (voiceOverlay) voiceOverlay.classList.remove('hidden');
            if (voiceStatusText) voiceStatusText.textContent = "Listening... Speak now";
            if (input) input.placeholder = "Listening to your voice...";
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');

            if (input) input.value = transcript;

            if (event.results[0].isFinal) {
                stopListening();
                if (transcript.trim()) {
                    sendMessage(transcript.trim(), true);
                    if (input) input.value = '';
                }
            }
        };

        recognition.onerror = () => {
            stopListening();
            fallbackVoiceSimulation();
        };

        recognition.onend = () => {
            if (isListening) stopListening();
        };
    }

    function startListening() {
        isVoiceModeActive = true;
        if (isSpeaking && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            isSpeaking = false;
        }
        if (recognition) {
            try {
                recognition.start();
            } catch (e) {
                fallbackVoiceSimulation();
            }
        } else {
            fallbackVoiceSimulation();
        }
    }

    function stopListening() {
        isListening = false;
        if (voiceBarBtn) voiceBarBtn.classList.remove('listening');
        if (!isSpeaking && voiceOverlay) voiceOverlay.classList.add('hidden');
        if (input) input.placeholder = "Ask anything...";
        if (recognition) {
            try { recognition.stop(); } catch(e) {}
        }
    }

    function fallbackVoiceSimulation() {
        isListening = true;
        isVoiceModeActive = true;
        if (voiceBarBtn) voiceBarBtn.classList.add('listening');
        if (voiceOverlay) voiceOverlay.classList.remove('hidden');
        if (voiceStatusText) voiceStatusText.textContent = "Voice Assistant active";
        if (input) input.placeholder = "Listening... Speak now";

        setTimeout(() => {
            if (input) input.value = "What can GoodMeetings AI do?";
            setTimeout(() => {
                stopListening();
                if (input) {
                    const text = input.value;
                    input.value = '';
                    sendMessage(text, true);
                }
            }, 900);
        }, 1600);
    }

    function getTimeBasedGreeting() {
        const hour = new Date().getHours();
        let greeting = "Good morning";
        if (hour >= 12 && hour < 17) {
            greeting = "Good afternoon";
        } else if (hour >= 17 || hour < 4) {
            greeting = "Good evening";
        }
        return `${greeting}! I'm your GoodMeetings AI assistant. How can I help you out today?`;
    }

    function handleSpeakWithAIPill() {
        // Ensure chat window is open when speak pill/mic is clicked
        toggleChat(true);

        if (isListening || isSpeaking) {
            stopListening();
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            isSpeaking = false;
        } else {
            const greeting = getTimeBasedGreeting();
            appendMessage(greeting, 'bot');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            speakText(greeting, () => {
                startListening();
            });
        }
    }

    if (voiceBarBtn) {
        voiceBarBtn.addEventListener('click', () => {
            if (isListening || isSpeaking) {
                stopListening();
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                isSpeaking = false;
            } else {
                handleSpeakWithAIPill();
            }
        });
    }

    if (micBtn) {
        micBtn.addEventListener('click', () => {
            handleSpeakWithAIPill();
        });
    }

    if (voiceStopBtn) {
        voiceStopBtn.addEventListener('click', () => {
            stopListening();
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                isSpeaking = false;
            }
            if (voiceOverlay) voiceOverlay.classList.add('hidden');
        });
    }

    let isVoiceModeActive = false;

    // Voice Selection & Audio Synthesis
    let availableVoices = [];
    function loadVoices() {
        if ('speechSynthesis' in window) {
            availableVoices = window.speechSynthesis.getVoices();
        }
    }
    if ('speechSynthesis' in window) {
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Speak AI Response back using SpeechSynthesis with onEndCallback support
    function speakText(text, onEndCallback) {
        if (!('speechSynthesis' in window)) {
            if (onEndCallback) onEndCallback();
            return;
        }

        try {
            window.speechSynthesis.cancel(); // Stop prior speech
            // Clean up text so speech flows like natural spoken English
            let cleanText = text.replace(/<[^>]*>?/gm, '')
                                .replace(/&nbsp;/g, ' ')
                                .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
                                .replace(/•/g, ', ')
                                .replace(/→/g, '')
                                .trim(); 

            if (!cleanText) {
                if (onEndCallback) onEndCallback();
                return;
            }

            const utterance = new SpeechSynthesisUtterance(cleanText);
            // Human-like natural cadence tuning
            utterance.pitch = 1.0; 
            utterance.rate = 0.98;
            utterance.volume = 1.0;

            if (availableVoices.length === 0) availableVoices = window.speechSynthesis.getVoices();
            
            // Prioritize highest quality crystal clear female voices across platforms
            const premiumFemaleVoices = [
                'Google US English', 
                'Samantha', 
                'Karen', 
                'Victoria', 
                'Serena', 
                'Fiona', 
                'Moira', 
                'Zira', 
                'Microsoft Zira',
                'Natural'
            ];

            let preferredVoice = null;
            for (const name of premiumFemaleVoices) {
                const found = availableVoices.find(v => v.lang.startsWith('en') && v.name.includes(name));
                if (found) {
                    preferredVoice = found;
                    break;
                }
            }

            if (!preferredVoice) {
                preferredVoice = availableVoices.find(v => v.lang.startsWith('en') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'))) || availableVoices.find(v => v.lang.startsWith('en'));
            }

            if (preferredVoice) utterance.voice = preferredVoice;

            utterance.onstart = () => {
                isSpeaking = true;
                if (voiceOverlay) voiceOverlay.classList.remove('hidden');
                if (voiceStatusText) voiceStatusText.textContent = "GoodMeetings AI speaking...";
            };

            utterance.onend = () => {
                isSpeaking = false;
                if (!isListening && voiceOverlay) voiceOverlay.classList.add('hidden');
                if (onEndCallback) onEndCallback();
            };

            utterance.onerror = () => {
                isSpeaking = false;
                if (!isListening && voiceOverlay) voiceOverlay.classList.add('hidden');
                if (onEndCallback) onEndCallback();
            };

            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.error("Speech Synthesis error:", err);
            if (onEndCallback) onEndCallback();
        }
    }

    function sendMessage(text, isFromVoice = false) {
        // Append User Message
        appendMessage(text, 'user');

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Show typing indicator
        const typingElement = showTypingIndicator();
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Generate bot reply after short delay
        setTimeout(() => {
            if (typingElement && typingElement.parentNode) {
                typingElement.parentNode.removeChild(typingElement);
            }
            const reply = getBotReply(text);
            appendMessage(reply, 'bot');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Only speak aloud if voice mode was explicitly triggered (speak pill / voice button)
            if (isFromVoice || isVoiceModeActive) {
                speakText(reply);
            }
        }, 700);
    }

    function showTypingIndicator() {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', 'bot-message');

        const orbDiv = document.createElement('div');
        orbDiv.classList.add('bot-avatar-orb');

        const bodyDiv = document.createElement('div');
        bodyDiv.classList.add('msg-body');

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.innerHTML = `
            <div class="typing-indicator">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        `;

        bodyDiv.appendChild(contentDiv);
        messageDiv.appendChild(orbDiv);
        messageDiv.appendChild(bodyDiv);
        messagesContainer.appendChild(messageDiv);
        return messageDiv;
    }

    function appendMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', `${sender}-message`);

        const bodyDiv = document.createElement('div');
        bodyDiv.classList.add('msg-body');

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.innerHTML = text;

        const timeSpan = document.createElement('span');
        timeSpan.classList.add('message-time');

        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (sender === 'user') {
            timeSpan.innerHTML = `${nowStr} <svg class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline><polyline points="15 6 9 13"></polyline></svg>`;
        } else {
            timeSpan.textContent = nowStr;
        }

        bodyDiv.appendChild(contentDiv);
        bodyDiv.appendChild(timeSpan);

        if (sender === 'bot') {
            const orbDiv = document.createElement('div');
            orbDiv.classList.add('bot-avatar-orb');
            messageDiv.appendChild(orbDiv);
        }

        messageDiv.appendChild(bodyDiv);
        messagesContainer.appendChild(messageDiv);

        // Bind interactive handlers if a calendar widget was appended
        const calWidget = messageDiv.querySelector('.calendar-widget-card');
        if (calWidget) {
            const tabs = calWidget.querySelectorAll('.host-segment, .cal-tab');
            const confirmBanner = calWidget.querySelector('#cal-confirm-banner');

            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    confirmBanner?.classList.add('hidden');
                });
            });

            let selectedSlotTime = null;
            const slotBtns = calWidget.querySelectorAll('.slot-btn');
            slotBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    slotBtns.forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedSlotTime = btn.getAttribute('data-time');
                });
            });

            const submitBtn = calWidget.querySelector('#cal-submit-demo');
            if (submitBtn) {
                submitBtn.addEventListener('click', () => {
                    const name = calWidget.querySelector('.cal-name')?.value.trim();
                    const email = calWidget.querySelector('.cal-email')?.value.trim();
                    const company = calWidget.querySelector('.cal-company')?.value.trim();
                    const activeHost = (calWidget.querySelector('.host-segment.active') || calWidget.querySelector('.cal-tab.active'))?.getAttribute('data-host') || 'shreya';
                    const hostName = activeHost === 'soumya' ? 'Soumya' : 'Shreya';
                    const targetHostEmail = activeHost === 'soumya' ? 'soumya@goodmeetings.ai' : 'shreya@goodmeetings.ai';
                    // Send to both Shreya & Soumya so neither misses a lead!
                    const recipientList = "shreya@goodmeetings.ai, soumya@goodmeetings.ai";

                    if (!name || !email || !company) {
                        if (confirmBanner) {
                            confirmBanner.innerHTML = `Please enter your Name, Work Email, and Company Name.`;
                            confirmBanner.classList.remove('hidden');
                            confirmBanner.style.borderColor = '#f59e0b';
                            confirmBanner.style.color = '#fbbf24';
                        }
                        return;
                    }

                    if (!selectedSlotTime) {
                        if (confirmBanner) {
                            confirmBanner.innerHTML = `Please select a preferred time slot above.`;
                            confirmBanner.classList.remove('hidden');
                            confirmBanner.style.borderColor = '#f59e0b';
                            confirmBanner.style.color = '#fbbf24';
                        }
                        return;
                    }

                    // Disable button during submission
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Sending to ' + hostName + '...';

                    const subject = `GoodMeetings Demo Booking Request for ${hostName} - ${company} (${name})`;
                    const body = `Hi ${hostName},\n\nA new 1-on-1 demo has been booked via GoodMeetings AI Chatbot.\n\n` +
                                 `----------------------------------------\n` +
                                 `Host Selected: ${hostName} (${targetHostEmail})\n` +
                                 `Full Name: ${name}\n` +
                                 `Work Email: ${email}\n` +
                                 `Company: ${company}\n` +
                                 `Phone: ${phone}\n` +
                                 `Requested Slot: Tomorrow at ${selectedSlotTime} (IST)\n` +
                                 `----------------------------------------\n\n` +
                                 `Please send calendar invite to ${email}.`;

                    // Formspree API dispatch
                    fetch(`https://formspree.io/f/xbjnqpkz`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            _to: recipientList,
                            host: hostName,
                            hostEmail: targetHostEmail,
                            name: name,
                            email: email,
                            company: company,
                            phone: phone,
                            slotTime: selectedSlotTime,
                            message: body
                        })
                    }).catch(err => console.error("Dispatch error:", err));

                    // Direct Mailto launch sending to both Shreya and Soumya
                    const mailtoUrl = `mailto:shreya@goodmeetings.ai,soumya@goodmeetings.ai?cc=${encodeURIComponent(email)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    window.location.href = mailtoUrl;

                    setTimeout(() => {
                        submitBtn.disabled = false;
                        submitBtn.textContent = '✓ Demo Sent to ' + hostName;
                        
                        if (confirmBanner) {
                            confirmBanner.innerHTML = `<strong>Demo Request Sent to ${hostName}</strong><br>Recipient: <strong>${targetHostEmail}</strong><br>Time Slot: <strong>Tomorrow at ${selectedSlotTime}</strong><br>An email draft has been dispatched to ${hostName}.`;
                            confirmBanner.classList.remove('hidden');
                            confirmBanner.style.borderColor = '#10b981';
                            confirmBanner.style.color = '#6ee7b7';
                        }
                    }, 400);
                });
            }
        }
    }

    function getBotReply(userText) {
        const text = userText.toLowerCase().trim();

        if (text.includes('faq') || text.includes('frequently asked')) {
            return `<strong>GoodMeetings Knowledge Base & FAQs:</strong><br><br>
            • <strong>What we do:</strong> Evaluate all human & AI conversations across voice, video, chat, email, and support tickets.<br>
            • <strong>Compliance & Security:</strong> 100% audit of collection calls (BFSI ready), SOC2 Type II, cloud/on-prem/hybrid storage.<br>
            • <strong>Accuracy & Prediction:</strong> 99% transcription accuracy (100+ languages) & 99% conversion prediction accuracy.<br>
            • <strong>AI Voice Bot:</strong> Natural 24/7 sales, support & collection calls freeing 30-40% rep bandwidth.<br>
            • <strong>Integrations:</strong> 1-click integration with 100+ CRMs & dialers (Salesforce, HubSpot, etc.).`;
        } else if (text.includes('what does') || text.includes('do') || text.includes('about goodmeetings')) {
            return "Goodmeetings sits above your entire conversation layer—human agents and AI bots—across voice, video, chat, email, and support tickets. We evaluate all of it through one unified platform.";
        } else if (text.includes('different') || text.includes('competitor') || text.includes('other tool')) {
            return "We get better the more you use us. More conversations sharpen our models, making our bots smarter and creating a compounding advantage rather than just a basic feature list.";
        } else if (text.includes('workflow') || text.includes('join') || text.includes('upload')) {
            return "Goodmeetings can auto-join your calls directly, or integrate straight into your existing telephony stack and dialers.";
        } else if (text.includes('storage') || text.includes('stored') || text.includes('where is my data')) {
            return "Your call! We support cloud, on-premise, and hybrid deployments depending on your enterprise requirements.";
        } else if (text.includes('compliance') || text.includes('bfsi') || text.includes('regulation') || text.includes('audit')) {
            return "Yes! We audit 100% of collection calls for intent, commitments, and compliance violations—taking clients' compliance coverage from 4% to 100% and cutting turnaround from 5-6 days down to 5-6 hours.";
        } else if (text.includes('rbac') || text.includes('role') || text.includes('transcript access')) {
            return "Yes. You can assign roles so different team members see only the specific parts of a transcript relevant to them.";
        } else if (text.includes('accuracy') || text.includes('transcription accuracy')) {
            return "99% transcription accuracy, with complete audit coverage across every Indian and global language.";
        } else if (text.includes('trust') || text.includes('score') || text.includes('predict')) {
            return "Yes! Our inference engine hits 99% prediction accuracy on conversion likelihood (pay, convert, or ghost), built on a rubric-based model trained on real audited call data.";
        } else if (text.includes('cost') || text.includes('pricing') || text.includes('price')) {
            return "We offer flexible pricing depending on how you use us: per agent per month, per hour of calls processed, or per minute of bot calls.";
        } else if (text.includes('integration') || text.includes('crm') || text.includes('dialer')) {
            return "Yes! We have 100+ native integrations (Salesforce, HubSpot, Zoom, Meet, Teams), with call dispositions logged straight into your CRM.";
        } else if (text.includes('implementation') || text.includes('how long') || text.includes('setup')) {
            return "Implementation is simple—it is a seamless 1-click integration!";
        } else if (text.includes('who uses') || text.includes('customer') || text.includes('client') || text.includes('company')) {
            return "Trusted by leaders!<br>• <strong>Fintech:</strong> Paytm, CRED, Muthoot, Shriram Finance, Fino<br>• <strong>E-Commerce:</strong> Flipkart, Wakefit<br>• <strong>EdTech:</strong> Physics Wallah, upGrad, Classplus<br>• <strong>Auto:</strong> Spinny, Cars24<br>• <strong>SaaS:</strong> DevRev, Descope, Demand Farm";
        } else if (text.includes('result') || text.includes('roi') || text.includes('impact') || text.includes('case study')) {
            return "Proven Results:<br>• <strong>Sales:</strong> +30% revenue per rep, +20% conversions (Paytm)<br>• <strong>Collections:</strong> 99%+ accuracy, 100% compliance coverage<br>• <strong>Support:</strong> +20 pts CSAT, 50% productivity uplift (Physics Wallah)<br>• <strong>Voice Bot:</strong> 30-40% rep bandwidth freed up!";
        } else if (text.includes('trial') || text.includes('try') || text.includes('free trial') || text.includes('sign up') || text.includes('signup')) {
            setTimeout(() => {
                const modal = document.getElementById('free-trial-modal');
                if (modal) {
                    modal.classList.add('active');
                    modal.setAttribute('aria-hidden', 'false');
                    document.body.style.overflow = 'hidden';
                }
            }, 400);
            return `<strong>14-Day Free Trial Launched! 🚀</strong><br><br>
            I've opened your instant 14-Day Free Trial onboarding modal. You get:<br>
            • <strong>Instant 2-min setup</strong> for Google Meet, Zoom, MS Teams & Dialpad<br>
            • <strong>10 Free Outbound AI SDR Minutes</strong> to test voice bots<br>
            • <strong>Full CRM Sync & Live Coaching</strong> with zero credit card required!`;
        } else if (text.includes('demo') || text.includes('book') || text.includes('schedule')) {
            return `
            <div class="calendar-widget-card ultra-demo-card">
                <!-- Header -->
                <div class="demo-card-head">
                    <div class="demo-badge">1-ON-1 DEMO SESSION</div>
                    <h3>Schedule a Demo</h3>
                    <p>Pick a host and time slot to see GoodMeetings AI in action.</p>
                </div>

                <!-- Host Pill Switcher -->
                <div class="host-pill-selector">
                    <button class="host-segment active" data-host="shreya">
                        <div class="avatar-box shreya-bg">S</div>
                        <div class="host-info">
                            <strong>Shreya</strong>
                            <small>shreya@goodmeetings.ai</small>
                        </div>
                        <span class="check-mark">✓</span>
                    </button>
                    <button class="host-segment" data-host="soumya">
                        <div class="avatar-box soumya-bg">S</div>
                        <div class="host-info">
                            <strong>Soumya</strong>
                            <small>soumya@goodmeetings.ai</small>
                        </div>
                        <span class="check-mark">✓</span>
                    </button>
                </div>

                <!-- Form Section -->
                <div class="clean-form-container">
                    <div class="field-block">
                        <label>FULL NAME *</label>
                        <input type="text" class="cal-input cal-name" placeholder="e.g. Rahul Sharma" required>
                    </div>

                    <div class="field-block">
                        <label>WORK EMAIL *</label>
                        <input type="email" class="cal-input cal-email" placeholder="rahul@company.com" required>
                    </div>

                    <div class="field-grid-2">
                        <div class="field-block">
                            <label>COMPANY *</label>
                            <input type="text" class="cal-input cal-company" placeholder="Acme Inc." required>
                        </div>
                        <div class="field-block">
                            <label>PHONE (OPTIONAL)</label>
                            <input type="tel" class="cal-input cal-phone" placeholder="+91 98765 43210">
                        </div>
                    </div>
                </div>

                <!-- Time Slot Section -->
                <div class="slot-selection-area">
                    <div class="slot-header">
                        <span>SELECT TIME (TOMORROW, AUG 6)</span>
                        <span class="tz">IST</span>
                    </div>

                    <div class="calendar-slots-grid" id="cal-slots-container">
                        <button class="slot-btn" data-time="10:00 AM">10:00 AM</button>
                        <button class="slot-btn" data-time="11:30 AM">11:30 AM</button>
                        <button class="slot-btn" data-time="02:00 PM">02:00 PM</button>
                        <button class="slot-btn" data-time="04:30 PM">04:30 PM</button>
                        <button class="slot-btn" data-time="06:00 PM">06:00 PM</button>
                    </div>
                </div>

                <!-- Submit Button -->
                <button class="cal-submit-btn main-booking-btn" id="cal-submit-demo">
                    Confirm & Reserve Session →
                </button>

                <!-- Direct Google Calendar Link for Shreya -->
                <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=GoodMeetings+Demo+Session+with+Shreya&add=shreya@goodmeetings.ai&details=1-on-1+Demo+Session+for+GoodMeetings+AI+Conversation+Intelligence" target="_blank" class="cal-gcal-link-btn" style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;padding:9px;border-radius:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);color:#ffffff;font-size:12px;font-weight:600;text-decoration:none;transition:all 0.2s ease;">
                    Open in Google Calendar (Shreya)
                </a>

                <!-- Status Banner -->
                <div class="calendar-confirm-banner hidden" id="cal-confirm-banner"></div>
            </div>`;
        } else if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
            return "Hey there! Really nice to meet you. How can I help you learn more about GoodMeetings today?";
        } else {
            return "GoodMeetings sits above your entire conversation layer—evaluating human and AI interactions across voice, video, chat, email, and support tickets to drive predictable revenue. How can I assist you further?";
        }
    }
});

// ==========================================
// SCROLL-TRIGGERED FADE & POP ANIMATION LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    const animatedSections = document.querySelectorAll('.how-it-works-section, .platform-section, .pillars-section');
    animatedSections.forEach(sec => observer.observe(sec));

    const cards = document.querySelectorAll('.pillar-card, .pipeline-stage-card, .channel-card');
    cards.forEach(card => observer.observe(card));
});

// ==========================================
// DYNAMIC SMOOTH CONTINUOUS CENTER HIGHLIGHT LOGIC
// ==========================================
function updateRollingCenterHighlight() {
    const trackContainer = document.querySelector('.integrations-track-container');
    if (!trackContainer) return;

    const containerRect = trackContainer.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    const cards = trackContainer.querySelectorAll('.integration-card');
    const radius = 130; // Zone of influence around screen center

    cards.forEach(card => {
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distanceFromCenter = Math.abs(containerCenter - cardCenter);

        if (distanceFromCenter < radius) {
            // Smooth bell curve factor (1 at exact center, 0 at outer edge)
            const factor = Math.cos((distanceFromCenter / radius) * (Math.PI / 2));
            const scale = 1 + 0.16 * factor;
            const translateY = -8 * factor;
            const glowOpacity = 0.7 * factor;

            card.style.transform = `scale(${scale}) translateY(${translateY}px)`;
            card.style.borderColor = `rgba(168, 85, 247, ${0.1 + 0.8 * factor})`;
            card.style.boxShadow = `0 ${12 + 10 * factor}px ${32 + 20 * factor}px rgba(0, 0, 0, 0.7), 0 0 ${35 * factor}px rgba(168, 85, 247, ${glowOpacity})`;
            card.style.zIndex = Math.round(5 + 10 * factor);

            const iconWrapper = card.querySelector('.int-icon-wrapper');
            if (iconWrapper) {
                iconWrapper.style.transform = `scale(${1 + 0.12 * factor})`;
                iconWrapper.style.borderColor = `rgba(168, 85, 247, ${0.08 + 0.5 * factor})`;
            }
        } else {
            card.style.transform = '';
            card.style.borderColor = '';
            card.style.boxShadow = '';
            card.style.zIndex = '';
            const iconWrapper = card.querySelector('.int-icon-wrapper');
            if (iconWrapper) {
                iconWrapper.style.transform = '';
                iconWrapper.style.borderColor = '';
            }
        }
    });

    requestAnimationFrame(updateRollingCenterHighlight);
}

// Launch continuous animation frame loop
requestAnimationFrame(updateRollingCenterHighlight);

// Scroll listener for Sticky Navbar Glass Effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
});

// Interactive Omnichannel Channels & Laser Flow Hover Connection
document.addEventListener('DOMContentLoaded', () => {
    const channelCards = document.querySelectorAll('.channels-grid .channel-card');
    const laserBeams = document.querySelectorAll('.confluence-svg .laser-beam');
    const focalPoint = document.querySelector('.laser-focal-point');
    const evalCore = document.querySelector('.evaluation-layer-core');

    const channelColors = ['#5EEAD4', '#2dd4bf', '#5EEAD4', '#0F766E', '#5EEAD4', '#2dd4bf'];

    channelCards.forEach((card, index) => {
        // 3D Parallax Tilt Effect on Mouse Move
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -7;
            const rotateY = ((x - centerX) / centerX) * 7;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
        });

        // Hover Laser Stream Connection
        card.addEventListener('mouseenter', () => {
            const color = channelColors[index % channelColors.length];
            laserBeams.forEach((beam, bIdx) => {
                if (bIdx === index) {
                    beam.style.strokeWidth = '5px';
                    beam.style.stroke = color;
                    beam.style.filter = `drop-shadow(0 0 12px ${color})`;
                    beam.style.opacity = '1';
                } else {
                    beam.style.opacity = '0.2';
                }
            });
            if (focalPoint) {
                focalPoint.style.transform = 'scale(2)';
                focalPoint.style.fill = color;
                focalPoint.style.filter = `drop-shadow(0 0 18px ${color})`;
            }
            if (evalCore) {
                evalCore.style.borderColor = `${color}66`;
                evalCore.style.boxShadow = `0 16px 48px rgba(0, 0, 0, 0.6), 0 0 35px ${color}33, inset 0 0 30px ${color}22`;
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            laserBeams.forEach(beam => {
                beam.style.strokeWidth = '';
                beam.style.stroke = '';
                beam.style.filter = '';
                beam.style.opacity = '';
            });
            if (focalPoint) {
                focalPoint.style.transform = '';
                focalPoint.style.fill = '';
                focalPoint.style.filter = '';
            }
            if (evalCore) {
                evalCore.style.borderColor = '';
                evalCore.style.boxShadow = '';
            }
        });
    });
});

// ==========================================
// THEME CONTROLLER: Dark / Light Mode Toggle
// ==========================================
function initThemeController() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    const savedTheme = localStorage.getItem('gm-theme');
    
    // Check saved theme
    if (savedTheme === 'light' || window.location.search.indexOf('theme=light') !== -1) {
        document.body.classList.add('light-mode');
        document.documentElement.classList.add('light-mode');
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('light-mode');
            document.documentElement.classList.toggle('light-mode', isLight);
            
            if (isLight) {
                localStorage.setItem('gm-theme', 'light');
            } else {
                localStorage.setItem('gm-theme', 'dark');
            }
        });
    }
}

// ==========================================
// 4-STAGE PIPELINE INTERACTIVITY
// ==========================================
function initPipelineInteractivity() {
    const cards = document.querySelectorAll('.pipeline-card');
    const connectors = document.querySelectorAll('.conn-orb-btn');

    connectors.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            const nextCard = cards[index + 1];
            if (nextCard) {
                // Highlight next card with pulse effect
                nextCard.style.transform = 'translateY(-12px) scale(1.02)';
                nextCard.style.borderColor = 'rgba(168, 85, 247, 0.8)';
                nextCard.style.boxShadow = '0 32px 70px rgba(0, 0, 0, 0.7), 0 0 45px rgba(168, 85, 247, 0.4)';
                
                btn.style.transform = 'scale(1.3) rotate(360deg)';
                
                setTimeout(() => {
                    nextCard.style.transform = '';
                    nextCard.style.borderColor = '';
                    nextCard.style.boxShadow = '';
                    btn.style.transform = '';
                }, 700);
            }
        });
    });
}

// ==========================================
// VOICE BOT 3D FLIP CARD (HOVER & CLICK FLIP)
// ==========================================
function initVoiceBotFlipCard() {
    const flipWrapper = document.getElementById('voiceBotFlipCard');
    if (!flipWrapper) return;

    // Toggle on Click (ideal for mobile/touch or sticky view on desktop)
    flipWrapper.addEventListener('click', () => {
        flipWrapper.classList.toggle('is-flipped');
    });
}

// ==========================================================================
// SHREYA DEMO BOOKING MODAL CONTROLLER (CALENDAR & MULTI-STEP FLOW)
// ==========================================================================
function initShreyaBookingModal() {
    const modal = document.getElementById('shreya-demo-modal');
    if (!modal) return;

    const backBtn = document.getElementById('booking-back-btn');
    const logoHome = document.getElementById('booking-logo-home');
    const finishBtn = document.getElementById('booking-finish-btn');
    
    // Step views
    const step1 = document.getElementById('booking-step-1');
    const step2 = document.getElementById('booking-step-2');
    const step3 = document.getElementById('booking-step-3');
    
    const continueBtn = document.getElementById('booking-continue-btn');
    const backToStep1Btn = document.getElementById('booking-back-to-step1');
    const demoForm = document.getElementById('shreya-demo-form');
    const errorBanner = document.getElementById('booking-error-banner');
    
    // Calendar DOM elements
    const monthTitle = document.getElementById('cal-month-title');
    const prevMonthBtn = document.getElementById('cal-prev-month');
    const nextMonthBtn = document.getElementById('cal-next-month');
    const daysGrid = document.getElementById('cal-days-grid');
    const selectedDateText = document.getElementById('cal-selected-text');
    const slotsGrid = document.getElementById('slots-buttons-grid');
    
    // Form & Confirmation fields
    const formSummaryText = document.getElementById('form-summary-slot-text');
    const attendeeEmailSpan = document.getElementById('success-attendee-email');
    const confirmedDateSpan = document.getElementById('success-confirmed-date');
    const confirmedTimeSpan = document.getElementById('success-confirmed-time');
    const meetBtn = document.getElementById('success-meet-btn');
    const tzSelect = document.getElementById('booking-tz-select');

    // State
    const monthsNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthShorts = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const DEFAULT_TIME_SLOTS = [
        "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
        "12:00 PM", "12:30 PM", "2:00 PM", "2:30 PM",
        "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM"
    ];

    let currentYear = 2026;
    let currentMonth = 8; // 0-indexed: September is 8
    let selectedDay = 24; // Default Sep 24, 2026
    let selectedTime = "10:00 AM";
    let selectedTz = "IST (UTC+5:30)";
    let bookedSlotsSet = new Set();

    function getSelectedDateIso() {
        const pad = n => String(n).padStart(2, '0');
        return `${currentYear}-${pad(currentMonth + 1)}-${pad(selectedDay)}`;
    }

    // Open Modal
    function openModal() {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        clearError();
        switchStep(1);
        fetchAvailability();
    }

    // Close Modal
    function closeModal() {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = 'auto';
        clearError();
    }

    function clearError() {
        if (errorBanner) {
            errorBanner.style.display = 'none';
            errorBanner.textContent = '';
        }
    }

    function showError(msg) {
        if (errorBanner) {
            errorBanner.textContent = msg;
            errorBanner.style.display = 'flex';
        }
    }

    // Attach trigger listeners to all "Book a Demo" buttons across website
    const demoTriggers = document.querySelectorAll(
        '.book-demo-trigger, .hero-btn-demo, .cta-demo-btn, #chatbot-demo-btn, [data-action="demo"]'
    );

    demoTriggers.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openModal();
        });
    });

    const closeCrossBtn = document.getElementById('booking-close-btn');
    if (backBtn) backBtn.addEventListener('click', closeModal);
    if (closeCrossBtn) closeCrossBtn.addEventListener('click', closeModal);
    if (logoHome) logoHome.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
    if (finishBtn) finishBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
    });

    function switchStep(stepNum) {
        [step1, step2, step3].forEach(step => step && step.classList.remove('active'));
        if (stepNum === 1 && step1) step1.classList.add('active');
        if (stepNum === 2 && step2) step2.classList.add('active');
        if (stepNum === 3 && step3) step3.classList.add('active');
    }

    // Fetch availability from backend
    async function fetchAvailability() {
        const dateIso = getSelectedDateIso();
        const apiBase = (window.location.protocol === 'file:') ? 'http://localhost:5050' : '';
        try {
            const resp = await fetch(`${apiBase}/api/availability?date=${encodeURIComponent(dateIso)}&timezone=${encodeURIComponent(selectedTz)}`);
            if (resp.ok) {
                const data = await resp.json().catch(() => ({}));
                if (data.success && Array.isArray(data.bookedSlots)) {
                    bookedSlotsSet = new Set(data.bookedSlots);
                } else {
                    bookedSlotsSet = new Set();
                }
            } else {
                bookedSlotsSet = new Set();
            }
        } catch (e) {
            bookedSlotsSet = new Set();
        }
        renderTimeSlots();
    }

    // Render Time Slots
    function renderTimeSlots() {
        if (!slotsGrid) return;
        slotsGrid.innerHTML = '';

        let hasActive = false;

        DEFAULT_TIME_SLOTS.forEach(time => {
            const isBooked = bookedSlotsSet.has(time);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'time-slot-btn';
            btn.setAttribute('data-time', time);
            btn.textContent = time;

            if (isBooked) {
                btn.classList.add('disabled');
                btn.disabled = true;
                btn.style.opacity = '0.35';
                btn.style.textDecoration = 'line-through';
                btn.style.cursor = 'not-allowed';
                btn.title = 'Slot unavailable';
            } else {
                if (time === selectedTime || (!hasActive && !isBooked)) {
                    btn.classList.add('active');
                    selectedTime = time;
                    hasActive = true;
                }

                btn.addEventListener('click', () => {
                    slotsGrid.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    selectedTime = time;
                });
            }

            slotsGrid.appendChild(btn);
        });
    }

    // Render Calendar
    function renderCalendar() {
        if (!daysGrid || !monthTitle) return;

        monthTitle.textContent = `${monthsNames[currentMonth]} ${currentYear}`;
        daysGrid.innerHTML = '';

        const firstDayDate = new Date(currentYear, currentMonth, 1);
        let startDay = firstDayDate.getDay() - 1;
        if (startDay === -1) startDay = 6;

        const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

        for (let i = 0; i < startDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'cal-day-cell empty';
            daysGrid.appendChild(emptyCell);
        }

        for (let day = 1; day <= totalDays; day++) {
            const cell = document.createElement('button');
            cell.className = 'cal-day-cell available';
            cell.textContent = day;
            cell.type = 'button';

            const dayOfWeek = (startDay + day - 1) % 7;
            const isWeekend = (dayOfWeek === 5 || dayOfWeek === 6);

            if (isWeekend) {
                cell.className = 'cal-day-cell disabled';
            } else {
                if (day === selectedDay) {
                    cell.classList.add('selected');
                }

                cell.addEventListener('click', () => {
                    daysGrid.querySelectorAll('.cal-day-cell').forEach(c => c.classList.remove('selected'));
                    cell.classList.add('selected');
                    selectedDay = day;
                    updateSelectedDisplay();
                    fetchAvailability();
                });
            }

            daysGrid.appendChild(cell);
        }

        updateSelectedDisplay();
    }

    function updateSelectedDisplay() {
        const dateStr = `${monthShorts[currentMonth]} ${selectedDay}, ${currentYear}`;
        if (selectedDateText) {
            selectedDateText.textContent = dateStr;
        }
    }

    // Month Navigation
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar();
            fetchAvailability();
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar();
            fetchAvailability();
        });
    }

    if (tzSelect) {
        tzSelect.addEventListener('change', () => {
            selectedTz = tzSelect.value;
            fetchAvailability();
        });
    }

    // Continue to Step 2
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            clearError();
            const shortTz = selectedTz.split(' ')[0];
            const summaryStr = `${monthShorts[currentMonth]} ${selectedDay}, ${currentYear} at ${selectedTime} (${shortTz}) with Shreya`;
            if (formSummaryText) {
                formSummaryText.textContent = summaryStr;
            }
            switchStep(2);
        });
    }

    // Back from Step 2 to Step 1
    if (backToStep1Btn) {
        backToStep1Btn.addEventListener('click', () => {
            clearError();
            switchStep(1);
        });
    }

    // Form Submit -> Server API Booking
    if (demoForm) {
        demoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearError();

            const submitBtn = document.getElementById('booking-submit-btn');
            const originalBtnHtml = `<span>Confirm Demo with Shreya ✓</span>`;

            const formEl = e.target;
            const name = (formEl.querySelector('[name="name"]')?.value || document.getElementById('demo-name')?.value || '').trim();
            const email = (formEl.querySelector('[name="email"]')?.value || document.getElementById('demo-email')?.value || '').trim();
            const phone = (formEl.querySelector('[name="phone"]')?.value || document.getElementById('demo-phone')?.value || '').trim();
            const company = (formEl.querySelector('[name="company"]')?.value || document.getElementById('demo-company')?.value || '').trim();
            const teamSize = (formEl.querySelector('[name="team_size"]')?.value || document.getElementById('demo-team-size')?.value || '11-50 reps').trim();
            const notes = (formEl.querySelector('[name="notes"]')?.value || document.getElementById('demo-notes')?.value || 'Personalized Product Walkthrough').trim();

            // Client-side quick validation
            if (!name) {
                showError('Please enter your full name.');
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                showError('Please enter a valid work email address.');
                return;
            }
            if (!company) {
                showError('Please enter your company name.');
                return;
            }
            if (!phone || phone.length < 6) {
                showError('Please enter a valid phone number.');
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<span class="btn-spinner" style="width: 14px; height: 14px; border: 2px solid #ffffff; border-top-color: transparent; border-radius: 50%; display: inline-block;"></span> <span>Booking your demo…</span>`;
            }

            const dateIso = getSelectedDateIso();
            const dateObj = new Date(currentYear, currentMonth, selectedDay);
            const weekdayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            const shortTz = selectedTz.split(' ')[0];
            const displayDateStr = `${weekdayName}, ${monthShorts[currentMonth]} ${selectedDay}, ${currentYear}`;
            const displayTimeStr = `${selectedTime} (${shortTz})`;
            const fullDateTime = `${displayDateStr} • ${displayTimeStr}`;

            const payload = {
                name,
                email,
                company,
                phone,
                team_size: teamSize,
                notes,
                date: dateIso,
                time: selectedTime,
                timezone: selectedTz,
                displayDateTime: fullDateTime
            };

            const apiBase = (window.location.protocol === 'file:') ? 'http://localhost:5050' : '';

            try {
                const response = await fetch(`${apiBase}/api/book-demo`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json().catch(() => ({}));

                if (!response.ok || !result.success) {
                    const errorMsg = result.error || (response.status === 409 
                        ? "This time slot is no longer available. Please select another time." 
                        : "We couldn't complete your booking. Please try again.");
                    
                    showError(errorMsg);
                    
                    if (response.status === 409) {
                        bookedSlotsSet.add(selectedTime);
                        renderTimeSlots();
                    }
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = originalBtnHtml;
                    }
                    return;
                }

                // Success! Populate Step 3 Success Screen
                if (confirmedDateSpan) confirmedDateSpan.textContent = displayDateStr;
                if (confirmedTimeSpan) confirmedTimeSpan.textContent = displayTimeStr;
                if (attendeeEmailSpan) attendeeEmailSpan.textContent = email;
                
                if (meetBtn) {
                    meetBtn.href = result.meetUrl || 'https://meet.google.com';
                    meetBtn.target = '_blank';
                    meetBtn.rel = 'noopener noreferrer';
                }

                // Reset submit button & clear form
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnHtml;
                }
                demoForm.reset();

                // Move to Step 3
                switchStep(3);
            } catch (err) {
                console.error('Booking submission error:', err);
                showError("We couldn't complete your booking. Please try again.");
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnHtml;
                }
            }
        });
    }

    renderCalendar();
    fetchAvailability();

    // If URL has ?type=demo or ?demo=true, auto-open modal
    if (window.location.search.includes('type=demo') || window.location.search.includes('demo=true')) {
        openModal();
    }
}

// ==========================================
// 14-DAY FREE TRIAL POP-UP MODAL CONTROLLER
// ==========================================
function initFreeTrialModal() {
    const modal = document.getElementById('free-trial-modal');
    if (!modal) return;

    const closeBtn = document.getElementById('trial-close-btn');
    const finishBtn = document.getElementById('trial-finish-btn');
    const logoHome = document.getElementById('trial-logo-home');

    const step1 = document.getElementById('trial-step-1');
    const step2 = document.getElementById('trial-step-2');
    const step3 = document.getElementById('trial-step-3');

    const form1 = document.getElementById('trial-step1-form');
    const form2 = document.getElementById('trial-step2-form');
    const backToStep1Btn = document.getElementById('trial-back-to-step1-btn');

    const ssoGoogleBtn = document.getElementById('trial-sso-google-btn');
    const ssoMsBtn = document.getElementById('trial-sso-ms-btn');

    const welcomeNameSpan = document.getElementById('trial-welcome-name');
    const successEmailSpan = document.getElementById('trial-success-email');
    const confirmedPlatformSpan = document.getElementById('trial-confirmed-platform');
    const sandboxBtn = document.getElementById('trial-launch-sandbox-btn');

    let trialData = {
        name: 'Elena Rostova',
        email: 'elena@company.com',
        company: 'Acme Global',
        teamSize: '6-20',
        platform: 'Google Meet',
        crm: 'HubSpot'
    };

    function openModal() {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        switchStep(1);
    }

    function closeModal() {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = 'auto';
    }

    function switchStep(stepNum) {
        [step1, step2, step3].forEach(step => step && step.classList.remove('active'));
        if (stepNum === 1 && step1) step1.classList.add('active');
        if (stepNum === 2 && step2) step2.classList.add('active');
        if (stepNum === 3 && step3) step3.classList.add('active');
    }

    // Attach to all trial triggers
    const trialTriggers = document.querySelectorAll('.trial-trigger, .nav-signup, [data-action="trial"]');
    trialTriggers.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });
    });

    // Close buttons & Backdrop
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (finishBtn) finishBtn.addEventListener('click', closeModal);
    if (logoHome) {
        logoHome.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal();
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // 1-Click SSO Handlers (Google / Microsoft)
    if (ssoGoogleBtn) {
        ssoGoogleBtn.addEventListener('click', () => {
            trialData.name = 'Alex Morgan';
            trialData.email = 'alex.morgan@gmail.com';
            const nameInput = document.getElementById('trial-fullname');
            const emailInput = document.getElementById('trial-email');
            if (nameInput) nameInput.value = trialData.name;
            if (emailInput) emailInput.value = trialData.email;
            switchStep(2);
        });
    }

    if (ssoMsBtn) {
        ssoMsBtn.addEventListener('click', () => {
            trialData.name = 'Jordan Taylor';
            trialData.email = 'jordan.taylor@microsoft-corp.com';
            const nameInput = document.getElementById('trial-fullname');
            const emailInput = document.getElementById('trial-email');
            if (nameInput) nameInput.value = trialData.name;
            if (emailInput) emailInput.value = trialData.email;
            switchStep(2);
        });
    }

    // Form 1 Submit -> Step 2
    if (form1) {
        form1.addEventListener('submit', (e) => {
            e.preventDefault();
            trialData.name = document.getElementById('trial-fullname')?.value || 'New User';
            trialData.email = document.getElementById('trial-email')?.value || 'user@company.com';
            switchStep(2);
        });
    }

    // Back to Step 1
    if (backToStep1Btn) {
        backToStep1Btn.addEventListener('click', () => {
            switchStep(1);
        });
    }

    // Platform Radio Card Selection
    const choiceCards = modal.querySelectorAll('.choice-card');
    choiceCards.forEach(card => {
        card.addEventListener('click', () => {
            choiceCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                trialData.platform = radio.value;
            }
        });
    });

    // Form 2 Submit -> Step 3 (Live Sandbox Activated)
    if (form2) {
        form2.addEventListener('submit', (e) => {
            e.preventDefault();
            trialData.company = document.getElementById('trial-company')?.value || 'Acme Global';
            trialData.teamSize = document.getElementById('trial-team-size')?.value || '6-20';
            trialData.crm = document.getElementById('trial-crm')?.value || 'HubSpot';
            
            const selectedPlatformRadio = modal.querySelector('input[name="meeting-plat"]:checked');
            if (selectedPlatformRadio) {
                trialData.platform = selectedPlatformRadio.value;
            }

            if (welcomeNameSpan) welcomeNameSpan.textContent = trialData.name.split(' ')[0] || trialData.name;
            if (successEmailSpan) successEmailSpan.textContent = trialData.email;
            if (confirmedPlatformSpan) confirmedPlatformSpan.textContent = `${trialData.platform} Bot Ready`;

            // Background Dispatch notification to Shreya & team
            const trialPayload = {
                "_subject": `New 14-Day Free Trial Signup: ${trialData.name} from ${trialData.company}`,
                "_replyto": trialData.email,
                "_template": "table",
                "_captcha": "false",
                "Lead Type": "14-Day Free Trial Onboarding",
                "Full Name": trialData.name,
                "Work Email": trialData.email,
                "Company Name": trialData.company,
                "Team Size / Reps": trialData.teamSize,
                "Meeting Platform": trialData.platform,
                "CRM Integration": trialData.crm,
                "Assigned Specialist": "Shreya (shreya@goodmeetings.ai)",
                "Trial Status": "Active - 14 Days Remaining"
            };

            sendDirectFormSubmission('shreya@goodmeetings.ai', trialPayload);

            switchStep(3);
        });
    }

    // Launch Sandbox button on success screen
    if (sandboxBtn) {
        sandboxBtn.addEventListener('click', () => {
            closeModal();
            // Smoothly scroll to the interactive product centerpiece showcase
            const centerpiece = document.querySelector('.hero-showcase-centerpiece') || document.querySelector('.platform-pillars-section') || document.querySelector('#how-it-works');
            if (centerpiece) {
                centerpiece.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initThemeController();
    initPipelineInteractivity();
    initVoiceBotFlipCard();
    initShreyaBookingModal();
    initFreeTrialModal();
});



