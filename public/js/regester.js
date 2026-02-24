
        lucide.createIcons();

        const passwordInput = document.getElementById('password');
        const eyeIconContainer = document.getElementById('eyeIcon');

        eyeIconContainer.addEventListener('click', () => {
       
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');

         
            eyeIconContainer.innerHTML = isPassword 
                ? '<i data-lucide="eye-off"></i>' 
                : '<i data-lucide="eye"></i>';
            
           
            lucide.createIcons();
        });