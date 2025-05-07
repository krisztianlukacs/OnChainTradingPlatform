// DOM Elements
const connectWalletBtn = document.querySelector('.connect-wallet-btn');
const heroButtons = document.querySelectorAll('.hero-buttons button');
const contactForm = document.querySelector('.contact-form form');

// Wallet connection state
let walletConnected = false;
let walletAddress = null;

/**
 * Initialize the application
 */
function init() {
  // Add event listeners
  connectWalletBtn.addEventListener('click', handleWalletConnection);
  heroButtons.forEach(button => {
    button.addEventListener('click', handleHeroButtonClick);
  });
  
  if (contactForm) {
    contactForm.addEventListener('submit', handleFormSubmit);
  }
  
  // Check if wallet is already connected (e.g., from localStorage)
  checkWalletConnection();
}

/**
 * Check if wallet is already connected
 */
function checkWalletConnection() {
  // In a real application, you would check if the wallet is connected
  // For this example, we'll just use localStorage
  const savedWalletAddress = localStorage.getItem('walletAddress');
  
  if (savedWalletAddress) {
    walletConnected = true;
    walletAddress = savedWalletAddress;
    updateWalletUI();
  }
}

/**
 * Handle wallet connection button click
 */
async function handleWalletConnection() {
  if (walletConnected) {
    // Disconnect wallet
    disconnectWallet();
  } else {
    // Connect wallet
    await connectWallet();
  }
}

/**
 * Connect to wallet
 */
async function connectWallet() {
  try {
    // Check if Phantom wallet is installed
    const isPhantomInstalled = window.solana && window.solana.isPhantom;
    
    if (!isPhantomInstalled) {
      alert('Phantom wallet is not installed. Please install it from https://phantom.app/');
      return;
    }
    
    // Connect to Phantom wallet
    const response = await window.solana.connect();
    walletAddress = response.publicKey.toString();
    walletConnected = true;
    
    // Save wallet address to localStorage
    localStorage.setItem('walletAddress', walletAddress);
    
    // Update UI
    updateWalletUI();
    
    console.log('Wallet connected:', walletAddress);
  } catch (error) {
    console.error('Error connecting to wallet:', error);
    alert('Failed to connect wallet. Please try again.');
  }
}

/**
 * Disconnect wallet
 */
function disconnectWallet() {
  // Disconnect from wallet
  if (window.solana && window.solana.isPhantom) {
    window.solana.disconnect();
  }
  
  // Clear wallet state
  walletConnected = false;
  walletAddress = null;
  
  // Remove wallet address from localStorage
  localStorage.removeItem('walletAddress');
  
  // Update UI
  updateWalletUI();
  
  console.log('Wallet disconnected');
}

/**
 * Update UI based on wallet connection state
 */
function updateWalletUI() {
  if (walletConnected) {
    // Update connect wallet button
    connectWalletBtn.textContent = `Disconnect (${shortenAddress(walletAddress)})`;
    connectWalletBtn.classList.add('connected');
  } else {
    // Reset connect wallet button
    connectWalletBtn.textContent = 'Connect Wallet';
    connectWalletBtn.classList.remove('connected');
  }
}

/**
 * Shorten wallet address for display
 */
function shortenAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Handle hero button clicks
 */
function handleHeroButtonClick(event) {
  const buttonText = event.target.textContent;
  
  if (buttonText === 'Get Started') {
    // If wallet is not connected, prompt to connect
    if (!walletConnected) {
      connectWallet();
    } else {
      // Redirect to dashboard or app
      alert('Redirecting to dashboard... (This would navigate to your app in a real implementation)');
    }
  } else if (buttonText === 'Learn More') {
    // Scroll to features section
    document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * Handle contact form submission
 */
function handleFormSubmit(event) {
  event.preventDefault();
  
  // Get form data
  const formData = new FormData(event.target);
  const name = formData.get('name');
  const email = formData.get('email');
  const message = formData.get('message');
  
  // In a real application, you would send this data to your backend
  console.log('Form submitted:', { name, email, message });
  
  // Show success message
  alert('Thank you for your message! We will get back to you soon.');
  
  // Reset form
  event.target.reset();
}

/**
 * Check if the page is loaded in a secure context (HTTPS)
 * This is required for some Web3 features
 */
function checkSecureContext() {
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    console.warn('This page is not being served in a secure context (HTTPS), some Web3 features may not work.');
  }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  checkSecureContext();
  init();
});

// Add a placeholder hero image for development
function createPlaceholderHeroImage() {
  const heroImageContainer = document.querySelector('.hero-image');
  if (heroImageContainer && !heroImageContainer.querySelector('img').src) {
    const placeholderSvg = `
      <svg width="500" height="400" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="500" height="400" rx="8" fill="#E9ECEF"/>
        <path d="M250 200m-80 0a80 80 0 1 0 160 0a80 80 0 1 0 -160 0" fill="#3A86FF"/>
        <path d="M170 200L250 120L330 200L250 280L170 200Z" fill="#8338EC"/>
        <circle cx="250" cy="200" r="30" fill="white"/>
      </svg>
    `;
    
    const img = document.createElement('img');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(placeholderSvg);
    img.alt = 'Trading Platform Illustration';
    
    heroImageContainer.innerHTML = '';
    heroImageContainer.appendChild(img);
  }
}

// Create placeholder hero image when the DOM is loaded
document.addEventListener('DOMContentLoaded', createPlaceholderHeroImage);