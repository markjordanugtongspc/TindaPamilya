import Swal from 'sweetalert2';

/**
 * Global SweetAlert2 Toast configuration for TindaPamilya
 */
export const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
        container: 'swal2-toast-container'
    },
    didOpen: (toast) => {
        // High z-index to stay above drawer (z-50) and mobile overlays
        const container = Swal.getContainer();
        if (container) container.style.zIndex = '9999';

        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

/**
 * Success Toast
 * @param {string} message 
 */
export const showSuccessToast = (message) => {
    Toast.fire({
        icon: 'success',
        title: message,
        background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
    });
};

/**
 * Error Toast
 * @param {string} message 
 */
export const showErrorToast = (message) => {
    Toast.fire({
        icon: 'error',
        title: message,
        background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
    });
};

/**
 * Info Toast
 * @param {string} message 
 */
export const showInfoToast = (message) => {
    Toast.fire({
        icon: 'info',
        title: message,
        background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#1f2937'
    });
};
