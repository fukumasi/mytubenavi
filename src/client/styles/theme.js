const baseTheme = {
  fontSizes: {
    small: '12px',
    medium: '16px',
    large: '20px',
    xlarge: '24px',
  },
  spacing: {
    small: '8px',
    medium: '16px',
    large: '24px',
    xlarge: '32px',
  },
  borderRadius: '4px',
  maxWidth: '1200px',
  breakpoints: {
    mobile: '768px',
    tablet: '1024px',
  },
};

const lightTheme = {
  ...baseTheme,
  colors: {
    primary: '#007bff',
    primaryDark: '#0056b3',
    secondary: '#6c757d',
    background: '#ffffff',
    backgroundLight: '#f8f9fa',
    text: '#333333',
    textSecondary: '#6c757d',
    border: '#dee2e6',
    error: '#dc3545',
    success: '#28a745',
    warning: '#ffc107',
    info: '#17a2b8',
    shadow: 'rgba(0, 0, 0, 0.1)',
    disabled: '#e9ecef',
  },
};

const darkTheme = {
  ...baseTheme,
  colors: {
    primary: '#4dabf7',
    primaryDark: '#339af0',
    secondary: '#ced4da',
    background: '#343a40',
    backgroundLight: '#495057',
    text: '#f8f9fa',
    textSecondary: '#adb5bd',
    border: '#495057',
    error: '#f03e3e',
    success: '#51cf66',
    warning: '#fcc419',
    info: '#15aabf',
    shadow: 'rgba(255, 255, 255, 0.1)',
    disabled: '#495057',
  },
};

export default {
  light: lightTheme,
  dark: darkTheme,
};
