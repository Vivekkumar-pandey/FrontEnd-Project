 class PremiumTypingAnimator {
            constructor() {
                this.textDisplay = document.getElementById('textDisplay');
                this.nameInput = document.getElementById('nameInput');
                this.cursor = document.getElementById('cursor');
                
                this.displayedText = '';
                this.targetText = '';
                this.isAnimating = false;
                
                this.currentEffect = 'cyber';
                this.currentFont = 'orbitron';
                
                this.setupEventListeners();
                this.createFloatingParticles();
                this.setupMatrixRain();
                this.startDemo();
            }

            setupEventListeners() {
                this.nameInput.addEventListener('input', (e) => {
                    const newText = e.target.value.toUpperCase();
                    this.updateText(newText);
                });

                // Style selector buttons
                document.querySelectorAll('.style-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
                        e.target.classList.add('active');
                        
                        this.currentFont = e.target.dataset.font;
                        this.currentEffect = e.target.dataset.effect;
                        this.updateTextStyle();
                        
                        // Create particles when switching styles
                        this.createStyleParticles();
                    });
                });
            }

            updateText(newText) {
                this.targetText = newText;
                if (!this.isAnimating) {
                    this.animateToTarget();
                }
            }

            async animateToTarget() {
                this.isAnimating = true;
                
                // First, remove letters that don't match
                while (this.displayedText.length > 0 && 
                       (this.displayedText.length > this.targetText.length || 
                        this.displayedText[this.displayedText.length - 1] !== this.targetText[this.displayedText.length - 1])) {
                    
                    await this.removeLetter();
                }
                
                // Then, add new letters
                while (this.displayedText.length < this.targetText.length) {
                    await this.addLetter();
                }
                
                this.isAnimating = false;
            }

            async removeLetter() {
                if (this.displayedText.length > 0) {
                    // Mark last letter for removal animation
                    const letters = this.textDisplay.querySelectorAll('.letter');
                    const lastLetter = letters[letters.length - 1];
                    if (lastLetter) {
                        lastLetter.classList.add('typing-out');
                        await this.wait(200);
                    }
                    
                    this.displayedText = this.displayedText.slice(0, -1);
                    this.renderText();
                    await this.wait(50);
                }
            }

            async addLetter() {
                if (this.displayedText.length < this.targetText.length) {
                    this.displayedText += this.targetText[this.displayedText.length];
                    this.renderText();
                    
                    // Trigger typing animation for the new letter
                    const letters = this.textDisplay.querySelectorAll('.letter');
                    const newLetter = letters[letters.length - 1];
                    if (newLetter) {
                        newLetter.classList.add('typing-in');
                    }
                    
                    // Create particles for new letter
                    this.createTypeParticles();
                    await this.wait(120);
                }
            }

            renderText() {
                const letters = this.displayedText.split('').map((letter, index) => {
                    return `<span class="letter">${letter === ' ' ? '&nbsp;' : letter}</span>`;
                }).join('');
                
                this.textDisplay.innerHTML = letters + '<span class="cursor" id="cursor"></span>';
                this.updateTextStyle();
            }

            updateTextStyle() {
                // Remove all existing classes
                this.textDisplay.className = '';
                // Add new classes
                this.textDisplay.classList.add('text-display', `font-${this.currentFont}`, `effect-${this.currentEffect}`);
            }

            createTypeParticles() {
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        const particle = document.createElement('div');
                        particle.className = 'particle';
                        particle.style.left = (45 + Math.random() * 10) + '%';
                        particle.style.bottom = (45 + Math.random() * 10) + '%';
                        particle.style.animationDelay = '0s';
                        document.getElementById('particles').appendChild(particle);
                        
                        setTimeout(() => {
                            if (particle.parentNode) {
                                particle.parentNode.removeChild(particle);
                            }
                        }, 4000);
                    }, i * 50);
                }
            }

            createStyleParticles() {
                for (let i = 0; i < 10; i++) {
                    setTimeout(() => {
                        const particle = document.createElement('div');
                        particle.className = 'particle';
                        particle.style.left = Math.random() * 100 + '%';
                        particle.style.bottom = Math.random() * 100 + '%';
                        particle.style.animationDelay = '0s';
                        document.getElementById('particles').appendChild(particle);
                        
                        setTimeout(() => {
                            if (particle.parentNode) {
                                particle.parentNode.removeChild(particle);
                            }
                        }, 4000);
                    }, i * 30);
                }
            }

            createFloatingParticles() {
                setInterval(() => {
                    const particle = document.createElement('div');
                    particle.className = 'particle';
                    particle.style.left = Math.random() * 100 + '%';
                    particle.style.animationDelay = '0s';
                    document.getElementById('particles').appendChild(particle);
                    
                    setTimeout(() => {
                        if (particle.parentNode) {
                            particle.parentNode.removeChild(particle);
                        }
                    }, 4000);
                }, 800);
            }

            setupMatrixRain() {
                const canvas = document.getElementById('matrixCanvas');
                const ctx = canvas.getContext('2d');
                
                const resizeCanvas = () => {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                };
                
                resizeCanvas();
                window.addEventListener('resize', resizeCanvas);
                
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
                const fontSize = 14;
                let columns = Math.floor(canvas.width / fontSize);
                let drops = Array(columns).fill(1);
                
                const drawMatrix = () => {
                    ctx.fillStyle = 'rgba(240, 240, 243, 0.05)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    ctx.fillStyle = '#c0c0c0';
                    ctx.font = fontSize + 'px monospace';
                    
                    for (let i = 0; i < drops.length; i++) {
                        const text = chars[Math.floor(Math.random() * chars.length)];
                        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                        
                        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                            drops[i] = 0;
                        }
                        drops[i]++;
                    }
                };
                
                setInterval(drawMatrix, 50);
            }

            async startDemo() {
                await this.wait(1000);
                
                
                this.nameInput.value = '';
                const demoText = 'NAME';
                
                for (let i = 0; i <= demoText.length; i++) {
                    this.nameInput.value = demoText.substring(0, i);
                    this.updateText(demoText.substring(0, i));
                    await this.wait(300);
                }
                
                // Remove auto cycle -manual only
            }

            wait(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }
        }

        // Initialize the animator
        const animator = new PremiumTypingAnimator();
    