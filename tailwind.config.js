/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#004e4c',       // Teal escuro para texto principal, cabeçalhos
        'primary-focus': '#003a38',
        secondary: '#00995d',     // Verde vibrante para botões, destaques
        'secondary-focus': '#007a4a',
        accent: '#f47920',        // Laranja para ações secundárias, botões de análise
        'accent-focus': '#d8681c',
        'base-100': '#f3f4f6',      // Cinza claro para o fundo principal
        'base-200': '#ffffff',      // Branco para cartões
        info: '#3abff8',
        success: '#16a34a', // Cor de sucesso mais escura para melhor contraste
        warning: '#fbbd23',
        error: '#ef4444', // Cor de erro mais escura para melhor contraste
      }
    },
  },
  plugins: [],
}
