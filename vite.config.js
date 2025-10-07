import { defineConfig } from 'vite'

export default defineConfig( {
    base: process.env.Node_ENV ==='production'? '/Furnishedv3_threejs/': ''
})