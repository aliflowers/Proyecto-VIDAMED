# Comandos de la Terminal

Este documento describe los comandos necesarios para ejecutar los servidores de frontend y backend en los entornos de desarrollo y producción.

---

## Entorno de Desarrollo

Para el desarrollo local, necesitas ejecutar ambos servidores simultáneamente en terminales separadas.

### 1. Servidor Frontend (Interfaz de React)

-   **Ruta de ejecución:** `c:\Users\jesus\OneDrive\Escritorio\PROYECTOS WEB\Proyecto VIDAMED`
-   **Comando:**
    ```bash
    npm run dev
    ```
-   **Descripción:** Inicia el servidor de desarrollo de Vite con hot-reloading. La aplicación estará disponible en la dirección que indique la terminal (generalmente `http://localhost:5173`).

### 2. Servidor Backend (Proxy de la API)

-   **Ruta de ejecución:** `c:\Users\jesus\OneDrive\Escritorio\PROYECTOS WEB\Proyecto VIDAMED\api`
-   **Comando:**
    ```bash
    npm run dev
    ```
-   **Descripción:** Inicia el servidor de la API en modo de desarrollo usando `ts-node`. El servidor se reiniciará automáticamente con cada cambio en los archivos TypeScript.

---

## Entorno de Producción

Estos comandos son para construir y ejecutar la versión optimizada de la aplicación que se desplegaría en un servidor.

### 1. Servidor Frontend (Interfaz de React)

El proceso consta de dos pasos:

#### Paso 1: Construir los archivos estáticos

-   **Ruta de ejecución:** `c:\Users\jesus\OneDrive\Escritorio\PROYECTOS WEB\Proyecto VIDAMED`
-   **Comando:**
    ```bash
    npm run build
    ```
-   **Descripción:** Este comando compila y optimiza el código de React y lo empaqueta en la carpeta `dist`. Estos son los archivos que subirías a tu servicio de hosting.

#### Paso 2: Previsualizar la compilación de producción

-   **Ruta de ejecución:** `c:\Users\jesus\OneDrive\Escritorio\PROYECTOS WEB\Proyecto VIDAMED`
-   **Comando:**
    ```bash
    npm run preview
    ```
-   **Descripción:** Inicia un servidor web estático local que sirve los archivos de la carpeta `dist`. Es útil para verificar que la compilación de producción funciona correctamente antes de desplegarla.

### 2. Servidor Backend (Proxy de la API)

El proceso también consta de dos pasos:

#### Paso 1: Transpilar el código de TypeScript a JavaScript

-   **Ruta de ejecución:** `c:\Users\jesus\OneDrive\Escritorio\PROYECTOS WEB\Proyecto VIDAMED\api`
-   **Comando:**
    ```bash
    npm run build
    ```
-   **Descripción:** Transpila el código de TypeScript (`.ts`) a JavaScript (`.js`) y lo guarda en la carpeta `dist` dentro del directorio `api`.

#### Paso 2: Iniciar el servidor en producción

-   **Ruta de ejecución:** `c:\Users\jesus\OneDrive\Escritorio\PROYECTOS WEB\Proyecto VIDAMED\api`
-   **Comando:**
    ```bash
    npm start
    ```
-   **Descripción:** Ejecuta el código de JavaScript transpilado desde `dist/index.js` usando Node.js. Este es el comando que usarías en tu servidor de producción para mantener la API en funcionamiento.