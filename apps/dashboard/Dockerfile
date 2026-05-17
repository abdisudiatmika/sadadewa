# TAHAP 1: Membangun Aplikasi React (Vite)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy daftar dependensi
COPY package*.json ./

# Instal dependensi
RUN npm install

# Copy seluruh kode React
COPY . .

# KUNCI RAHASIA: Kosongkan VITE_API_BASE agar React memanggil URL-nya sendiri (yang nanti ditangkap Nginx)
ENV VITE_API_BASE=""

# Build file statis HTML/JS/CSS
RUN npm run build

# TAHAP 2: Menyajikan dengan Nginx
FROM nginx:alpine

# Hapus konfigurasi bawaan Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Masukkan konfigurasi Nginx buatan kita (Proxy)
COPY nginx.conf /etc/nginx/conf.d/

# Pindahkan hasil Build React dari Tahap 1 ke folder publik Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Buka Port 80
EXPOSE 80

# Jalankan Nginx selamanya
CMD ["nginx", "-g", "daemon off;"]
