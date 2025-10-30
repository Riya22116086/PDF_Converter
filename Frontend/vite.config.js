import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
})
// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })
//  /** @type {import('tailwindcss').Config} */
// export default {
//    content: ["./src/**/*.{html,js}"],
//    theme: {
//      extend: {},
//    },
//    plugins: [],
//  }