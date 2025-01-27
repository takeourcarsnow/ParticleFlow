class MotionControls {
    constructor(particleSystem) {
        this.system = particleSystem;
        this.isSupported = window.DeviceOrientationEvent && window.DeviceMotionEvent;
        this.acceleration = { x: 0, y: 0, z: 0 };
        this.orientation = { alpha: 0, beta: 0, gamma: 0 };
        this.sensitivity = 1.5;
        this.enabled = false;
    }

    async initialize() {
        if (!this.isSupported) return;
        
        try {
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission !== 'granted') {
                    throw new Error('Motion access denied');
                }
            }

            window.addEventListener('devicemotion', this.handleMotion.bind(this));
            window.addEventListener('deviceorientation', this.handleOrientation.bind(this));
            this.enabled = true;
        } catch (error) {
            console.error('Motion sensors not available:', error);
        }
    }

    handleMotion(event) {
        this.acceleration = {
            x: event.accelerationIncludingGravity.x * this.sensitivity,
            y: event.accelerationIncludingGravity.y * this.sensitivity,
            z: event.accelerationIncludingGravity.z * this.sensitivity
        };
    }

    handleOrientation(event) {
        this.orientation = {
            alpha: event.alpha,
            beta: event.beta,
            gamma: event.gamma
        };
    }

    applyMotionForces(particle) {
        if (!this.enabled) return;

        particle.vx += this.acceleration.x * 0.1;
        particle.vy += this.acceleration.y * 0.1;
        
        const orientationForce = 0.05;
        particle.vx += (this.orientation.gamma / 90) * orientationForce;
        particle.vy += (this.orientation.beta / 180) * orientationForce;
    }
}

class PhysicsSystem {
    constructor() {
        this.gravityForce = 0;
        this.windForce = 0;
        this.vortexForce = 0;
    }

    applyGravity(particle) {
        particle.vy += this.gravityForce * 0.1;
    }

    applyWind(particle) {
        particle.vx += Math.sin(Date.now() * 0.001) * this.windForce * 0.1;
    }

    applyVortex(particle, centerX, centerY) {
        const dx = particle.x - centerX;
        const dy = particle.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        particle.vx += Math.cos(angle + Math.PI/2) * (1/distance) * this.vortexForce;
        particle.vy += Math.sin(angle + Math.PI/2) * (1/distance) * this.vortexForce;
    }
}

class Particle {
    constructor(canvas, settings) {
        this.canvas = canvas;
        this.settings = settings;
        this.reset();
        this.history = [];
    }

    reset() {
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.color = this.getColor();
        this.angle = 0;
        this.size = this.settings.particleSize;
        this.originalSize = this.size;
    }

    getColor() {
        switch (this.settings.colorScheme) {
            case 'blue':
                return `hsla(210, 100%, 50%, ${Math.random() * 0.5 + 0.5})`;
            case 'purple':
                return `hsla(280, 100%, 50%, ${Math.random() * 0.5 + 0.5})`;
            case 'green':
                return `hsla(120, 100%, 50%, ${Math.random() * 0.5 + 0.5})`;
            case 'rainbow':
                return `hsla(${Math.random() * 360}, 100%, 50%, ${Math.random() * 0.5 + 0.5})`;
            case 'custom':
                return `hsla(${this.settings.customHue}, 100%, 50%, ${Math.random() * 0.5 + 0.5})`;
            default:
                return `hsla(210, 100%, 50%, ${Math.random() * 0.5 + 0.5})`;
        }
    }

    applyBehavior(particles, mousePos) {
        switch (this.settings.behavior) {
            case 'attract':
                this.attract(particles);
                break;
            case 'repel':
                this.repel(particles);
                break;
            case 'swarm':
                this.swarm(particles);
                break;
        }

        if (mousePos && this.settings.mouseInteraction !== 'none') {
            const dx = mousePos.x - this.x;
            const dy = mousePos.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const mouseRadius = 150;

            if (distance < mouseRadius) {
                const force = (mouseRadius - distance) / mouseRadius;
                const angle = Math.atan2(dy, dx);

                switch (this.settings.mouseInteraction) {
                    case 'attract':
                        this.vx += Math.cos(angle) * force * 0.5;
                        this.vy += Math.sin(angle) * force * 0.5;
                        break;
                    case 'repel':
                        this.vx -= Math.cos(angle) * force * 1;
                        this.vy -= Math.sin(angle) * force * 1;
                        break;
                }
            }
        }

        if (this.settings.enablePhysics) {
            this.vy += this.settings.gravityForce * 0.1;
            this.vx += Math.sin(Date.now() * 0.001) * this.settings.windForce * 0.1;
        }

        this.vx *= 0.99;
        this.vy *= 0.99;
    }

    attract(particles) {
        particles.forEach(particle => {
            if (particle !== this) {
                const dx = particle.x - this.x;
                const dy = particle.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 100 && distance > 0) {
                    const force = 0.1 * (distance / 100);
                    this.vx += (dx / distance) * force;
                    this.vy += (dy / distance) * force;
                }
            }
        });
    }

    repel(particles) {
        particles.forEach(particle => {
            if (particle !== this) {
                const dx = particle.x - this.x;
                const dy = particle.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 100 && distance > 0) {
                    const force = 0.1 * (1 - distance / 100);
                    this.vx -= (dx / distance) * force;
                    this.vy -= (dy / distance) * force;
                }
            }
        });
    }

    swarm(particles) {
        let centerX = 0;
        let centerY = 0;
        particles.forEach(particle => {
            centerX += particle.x;
            centerY += particle.y;
        });
        centerX /= particles.length;
        centerY /= particles.length;

        const dx = centerX - this.x;
        const dy = centerY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.vx += (dx / distance) * 0.05;
        this.vy += (dy / distance) * 0.05;
    }
	
	update() {
        if (this.settings.trail) {
            this.history.push({ x: this.x, y: this.y });
            if (this.history.length > 20) {
                this.history.shift();
            }
        }

        if (this.settings.enablePulse) {
            this.size = this.originalSize * (1 + Math.sin(Date.now() * 0.005) * 0.5);
        } else {
            this.size = this.originalSize;
        }

        this.x += this.vx * this.settings.speed;
        this.y += this.vy * this.settings.speed;
        this.angle += 0.02;

        if (this.x < 0) {
            this.x = 0;
            this.vx *= -0.8;
        }
        if (this.x > this.canvas.width) {
            this.x = this.canvas.width;
            this.vx *= -0.8;
        }
        if (this.y < 0) {
            this.y = 0;
            this.vy *= -0.8;
        }
        if (this.y > this.canvas.height) {
            this.y = this.canvas.height;
            this.vy *= -0.8;
        }

        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const maxSpeed = 10;
        if (speed > maxSpeed) {
            this.vx = (this.vx / speed) * maxSpeed;
            this.vy = (this.vy / speed) * maxSpeed;
        }
    }

    drawShape(ctx, x, y, size) {
        if (this.settings.enableGlow) {
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
            gradient.addColorStop(0, this.color);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(x - size * 2, y - size * 2, size * 4, size * 4);
        }

        ctx.fillStyle = this.color;
        switch (this.settings.particleShape) {
            case 'square':
                ctx.fillRect(x - size/2, y - size/2, size, size);
                break;
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(x, y - size);
                ctx.lineTo(x + size * Math.cos(Math.PI/6), y + size * Math.sin(Math.PI/6));
                ctx.lineTo(x - size * Math.cos(Math.PI/6), y + size * Math.sin(Math.PI/6));
                ctx.closePath();
                ctx.fill();
                break;
            case 'star':
                let rot = Math.PI / 2 * 3;
                let step = Math.PI / 5;
                let outerRadius = size;
                let innerRadius = size/2;
                ctx.beginPath();
                ctx.moveTo(x, y - outerRadius);
                for (let i = 0; i < 5; i++) {
                    ctx.lineTo(x + Math.cos(rot) * outerRadius, y + Math.sin(rot) * outerRadius);
                    rot += step;
                    ctx.lineTo(x + Math.cos(rot) * innerRadius, y + Math.sin(rot) * innerRadius);
                    rot += step;
                }
                ctx.closePath();
                ctx.fill();
                break;
            default:
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
        }
    }

    draw(ctx) {
        if (this.settings.trail && this.history.length > 2) {
            ctx.beginPath();
            ctx.moveTo(this.history[0].x, this.history[0].y);
            for (let i = 1; i < this.history.length; i++) {
                ctx.lineTo(this.history[i].x, this.history[i].y);
            }
            ctx.strokeStyle = this.color;
            ctx.stroke();
        }

        this.drawShape(ctx, this.x, this.y, this.size);
    }
}

class ParticleSystem {
    constructor() {
        this.canvas = document.getElementById('particleCanvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.particles = [];
        this.mousePos = null;
        this.physics = new PhysicsSystem();
        this.settings = {
            particleCount: 200,
            particleSize: 3,
            speed: 1,
            connectionRadius: 100,
            colorScheme: 'blue',
            particleShape: 'circle',
            behavior: 'normal',
            trail: false,
            trailLength: 0.1,
            mouseInteraction: 'none',
            enableGlow: false,
            enablePulse: false,
            enablePhysics: false,
            gravityForce: 0,
            windForce: 0,
            customHue: 210
        };

        this.motionControls = new MotionControls(this);
        this.setupCanvas();
        this.setupControls();
        this.setupMouseHandling();
        this.createParticles();
        this.animate();

        this.resizeObserver = new ResizeObserver(() => this.setupCanvas());
        this.resizeObserver.observe(this.canvas);
    }

    loadPreset(presetName) {
        const presets = {
            default: {
                particleCount: 200,
                particleSize: 3,
                speed: 1,
                connectionRadius: 100,
                colorScheme: 'blue',
                particleShape: 'circle',
                behavior: 'normal',
                trail: false,
                trailLength: 0.1,
                mouseInteraction: 'none',
                enableGlow: false,
                enablePulse: false,
                enablePhysics: false,
                gravityForce: 0,
                windForce: 0
            },
            galaxy: {
                particleCount: 300,
                particleSize: 2,
                speed: 0.5,
                connectionRadius: 150,
                colorScheme: 'purple',
                particleShape: 'circle',
                behavior: 'swarm',
                trail: true,
                trailLength: 0.3,
                mouseInteraction: 'attract',
                enableGlow: true,
                enablePulse: true,
                enablePhysics: false,
                gravityForce: 0,
                windForce: 0
            },
            chaos: {
                particleCount: 500,
                particleSize: 4,
                speed: 2,
                connectionRadius: 100,
                colorScheme: 'rainbow',
                particleShape: 'star',
                behavior: 'repel',
                trail: false,
                trailLength: 0.1,
                mouseInteraction: 'repel',
                enableGlow: true,
                enablePulse: false,
                enablePhysics: true,
                gravityForce: 0.2,
                windForce: 0.3
            },
            minimal: {
                particleCount: 100,
                particleSize: 2,
                speed: 0.3,
                connectionRadius: 200,
                colorScheme: 'blue',
                particleShape: 'circle',
                behavior: 'normal',
                trail: false,
                trailLength: 0.1,
                mouseInteraction: 'none',
                enableGlow: false,
                enablePulse: false,
                enablePhysics: false,
                gravityForce: 0,
                windForce: 0
            }
        };

        const preset = presets[presetName];
        if (preset) {
            Object.assign(this.settings, preset);
            this.updateControlsFromSettings();
            this.createParticles();
        }
    }

    updateControlsFromSettings() {
        Object.keys(this.settings).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = this.settings[key];
                } else {
                    element.value = this.settings[key];
                }
            }
        });
    }

    saveConfiguration() {
        const configName = prompt('Enter a name for this configuration:');
        if (configName) {
            const savedConfigs = JSON.parse(localStorage.getItem('particleConfigs') || '{}');
            savedConfigs[configName] = this.settings;
            localStorage.setItem('particleConfigs', JSON.stringify(savedConfigs));
            alert('Configuration saved!');
        }
    }

    loadConfiguration() {
        const savedConfigs = JSON.parse(localStorage.getItem('particleConfigs') || '{}');
        const configNames = Object.keys(savedConfigs);
        
        if (configNames.length === 0) {
            alert('No saved configurations found.');
            return;
        }

        const configName = prompt('Enter configuration name to load:\n\nAvailable configs:\n' + configNames.join('\n'));
        if (configName && savedConfigs[configName]) {
            Object.assign(this.settings, savedConfigs[configName]);
            this.updateControlsFromSettings();
            this.createParticles();
        } else if (configName) {
            alert('Configuration not found.');
        }
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupMouseHandling() {
        const handleMouseMove = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };

        const handleTouchMove = (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mousePos = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
        };

        this.canvas.addEventListener('mousemove', handleMouseMove);
        this.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        this.canvas.addEventListener('mouseleave', () => this.mousePos = null);
        this.canvas.addEventListener('touchend', () => this.mousePos = null);

        this.canvas.addEventListener('click', (e) => {
            if (this.settings.mouseInteraction === 'create') {
                const rect = this.canvas.getBoundingClientRect();
                for (let i = 0; i < 5; i++) {
                    const particle = new Particle(this.canvas, this.settings);
                    particle.x = e.clientX - rect.left;
                    particle.y = e.clientY - rect.top;
                    particle.vx = (Math.random() - 0.5) * 4;
                    particle.vy = (Math.random() - 0.5) * 4;
                    this.particles.push(particle);
                }
            }
        });
    }

    setupControls() {
        document.getElementById('presets').addEventListener('change', (e) => {
            this.loadPreset(e.target.value);
        });

        document.getElementById('saveConfig').addEventListener('click', () => {
            this.saveConfiguration();
        });

        document.getElementById('loadConfig').addEventListener('click', () => {
            this.loadConfiguration();
        });

        const controls = {
            'particleCount': value => {
                this.settings.particleCount = parseInt(value);
                this.createParticles();
            },
            'particleSize': value => this.settings.particleSize = parseInt(value),
            'speed': value => this.settings.speed = parseFloat(value),
            'connectionRadius': value => this.settings.connectionRadius = parseInt(value),
            'particleShape': value => this.settings.particleShape = value,
            'colorScheme': value => {
                this.settings.colorScheme = value;
                this.particles.forEach(p => p.color = p.getColor());
            },
            'behavior': value => this.settings.behavior = value,
            'mouseInteraction': value => this.settings.mouseInteraction = value,
            'trail': value => this.settings.trail = value,
            'trailLength': value => this.settings.trailLength = parseFloat(value),
            'enableGlow': value => this.settings.enableGlow = value,
            'enablePulse': value => this.settings.enablePulse = value,
            'enablePhysics': value => this.settings.enablePhysics = value,
            'gravityForce': value => this.settings.gravityForce = parseFloat(value),
            'windForce': value => this.settings.windForce = parseFloat(value),
            'enableMotion': value => {
                if (value) {
                    this.motionControls.initialize();
                } else {
                    this.motionControls.enabled = false;
                }
            },
            'motionSensitivity': value => this.motionControls.sensitivity = parseFloat(value)
        };

        Object.keys(controls).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const eventType = element.type === 'checkbox' ? 'change' : 'input';
                element.addEventListener(eventType, (e) => {
                    const value = element.type === 'checkbox' ? e.target.checked : e.target.value;
                    controls[id](value);
                });
            }
        });
    }

    createParticles() {
        this.particles = Array.from({ length: this.settings.particleCount }, 
            () => new Particle(this.canvas, this.settings));
    }

    animate() {
        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.settings.trail ? this.settings.trailLength : 1})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distanceSquared = dx * dx + dy * dy;
                const maxDistanceSquared = this.settings.connectionRadius * this.settings.connectionRadius;

                if (distanceSquared < maxDistanceSquared) {
                    const alpha = (1 - Math.sqrt(distanceSquared) / this.settings.connectionRadius) * 0.5;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                    this.ctx.stroke();
                }
            }
        }

        this.particles.forEach(particle => {
            particle.applyBehavior(this.particles, this.mousePos);
            this.motionControls.applyMotionForces(particle);
            particle.update();
            particle.draw(this.ctx);
        });

        requestAnimationFrame(() => this.animate());
    }
}

// Initialize the particle system when the page loads
window.addEventListener('load', () => {
    new ParticleSystem();
});