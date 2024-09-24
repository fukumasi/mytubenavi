const baseTheme = {
  fontSizes: {
    xsmall: '10px',
    small: '12px',
    medium: '16px',
    large: '20px',
    xlarge: '24px',
    xxlarge: '32px',
  },
  spacing: {
    xsmall: '4px',
    small: '8px',
    medium: '16px',
    large: '24px',
    xlarge: '32px',
    xxlarge: '48px',
  },
  borderRadius: {
    small: '2px',
    medium: '4px',
    large: '8px',
    round: '50%',
  },
  maxWidth: '1200px',
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
    largeDesktop: '1200px',
  },
  transitions: {
    fast: '0.2s',
    medium: '0.3s',
    slow: '0.5s',
  },
};

const lightTheme = {
  ...baseTheme,
  name: 'light',
  colors: {
    primary: '#007bff',
    primaryDark: '#0056b3',
    primaryLight: '#e6f2ff',
    secondary: '#6c757d',
    secondaryDark: '#545b62',
    secondaryLight: '#f8f9fa',
    background: '#ffffff',
    backgroundLight: '#f8f9fa',
    backgroundDark: '#e9ecef',
    text: '#333333',
    textSecondary: '#6c757d',
    border: '#dee2e6',
    error: '#dc3545',
    success: '#28a745',
    warning: '#ffc107',
    info: '#17a2b8',
    shadow: 'rgba(0, 0, 0, 0.1)',
    disabled: '#e9ecef',
    skeletonBackground: '#f6f7f8',
    skeletonHighlight: '#edeef1',
    // Firebase関連の色
    firebaseYellow: '#FFCA28',
    firebaseOrange: '#FFA000',
    firebaseNavy: '#039BE5',
    firebaseBlue: '#4FC3F7',
  },
};

const darkTheme = {
  ...baseTheme,
  name: 'dark',
  colors: {
    primary: '#4dabf7',
    primaryDark: '#339af0',
    primaryLight: '#1c7ed6',
    secondary: '#ced4da',
    secondaryDark: '#adb5bd',
    secondaryLight: '#495057',
    background: '#343a40',
    backgroundLight: '#495057',
    backgroundDark: '#212529',
    text: '#f8f9fa',
    textSecondary: '#adb5bd',
    border: '#495057',
    error: '#f03e3e',
    success: '#51cf66',
    warning: '#fcc419',
    info: '#15aabf',
    shadow: 'rgba(255, 255, 255, 0.1)',
    disabled: '#495057',
    skeletonBackground: '#343a40',
    skeletonHighlight: '#495057',
    // Firebase関連の色
    firebaseYellow: '#FFCA28',
    firebaseOrange: '#FFA000',
    firebaseNavy: '#039BE5',
    firebaseBlue: '#4FC3F7',
  },
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
};

export const defaultTheme = lightTheme;

// 個別のテーマをエクスポート
export { lightTheme, darkTheme };

export default themes;