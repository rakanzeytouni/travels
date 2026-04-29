// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Lucide icons first
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    const passwordInput = document.getElementById('password');
    const eyeIconContainer = document.getElementById('eyeIcon');



    let isVisible = false;

    eyeIconContainer.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        isVisible = !isVisible;
        
        // Toggle password visibility
        passwordInput.setAttribute('type', isVisible ? 'text' : 'password');

        // Update icon
        if (typeof lucide !== 'undefined') {
            eyeIconContainer.innerHTML = isVisible 
                ? '<i data-lucide="eye-off"></i>' 
                : '<i data-lucide="eye"></i>';
            lucide.createIcons();
        }
    });

    // Focus password input when clicking on wrapper
    const passwordWrapper = document.querySelector('.password-wrapper');
    if (passwordWrapper) {
        passwordWrapper.addEventListener('click', function(e) {
            if (e.target !== eyeIconContainer && e.target !== passwordInput) {
                passwordInput.focus();
            }
        });
    }
});