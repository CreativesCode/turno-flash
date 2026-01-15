const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SVG_PATH = path.join(__dirname, "../public/images/isotipo.svg");

// Tamaños para Android
const ANDROID_SIZES = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

// Tamaño para iOS
const IOS_SIZE = 1024;

// Tamaños de splash screens para Android (width x height)
// Los splash screens en Android varían según orientación y densidad
const ANDROID_SPLASH_SIZES = {
  "drawable-port-mdpi": { width: 320, height: 480 },
  "drawable-port-hdpi": { width: 480, height: 800 },
  "drawable-port-xhdpi": { width: 720, height: 1280 },
  "drawable-port-xxhdpi": { width: 1080, height: 1920 },
  "drawable-port-xxxhdpi": { width: 1440, height: 2560 },
  "drawable-land-mdpi": { width: 480, height: 320 },
  "drawable-land-hdpi": { width: 800, height: 480 },
  "drawable-land-xhdpi": { width: 1280, height: 720 },
  "drawable-land-xxhdpi": { width: 1920, height: 1080 },
  "drawable-land-xxxhdpi": { width: 2560, height: 1440 },
  drawable: { width: 1080, height: 1920 }, // Por defecto, tamaño grande
};

// Tamaños de splash screens para iOS (cuadrados)
const IOS_SPLASH_SIZES = {
  "splash-2732x2732.png": 8196, // 3x
  "splash-2732x2732-1.png": 5464, // 2x
  "splash-2732x2732-2.png": 2732, // 1x
};

async function generateAndroidIcons() {
  console.log("Generando iconos para Android...");

  for (const [folder, size] of Object.entries(ANDROID_SIZES)) {
    const outputDir = path.join(
      __dirname,
      `../android/app/src/main/res/${folder}`
    );

    // Asegurar que el directorio existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      // Generar ic_launcher.png (icono normal)
      await sharp(SVG_PATH)
        .resize(size, size, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .png()
        .toFile(path.join(outputDir, "ic_launcher.png"));

      // Generar ic_launcher_foreground.png (para adaptive icon - sin padding)
      // El foreground debe tener el ícono centrado con padding interno
      // Android recomienda que el foreground sea 108% del tamaño base, luego lo recortamos al 66%
      const foregroundSize = Math.round(size * 1.08);
      const iconSize = Math.round(size * 0.66);
      const padding = Math.round((foregroundSize - iconSize) / 2);

      await sharp({
        create: {
          width: foregroundSize,
          height: foregroundSize,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparente
        },
      })
        .composite([
          {
            input: await sharp(SVG_PATH)
              .resize(iconSize, iconSize, { fit: "contain" })
              .png()
              .toBuffer(),
            top: padding,
            left: padding,
          },
        ])
        .png()
        .toFile(path.join(outputDir, "ic_launcher_foreground.png"));

      // Generar ic_launcher_round.png (icono redondo)
      await sharp(SVG_PATH)
        .resize(size, size, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .png()
        .toFile(path.join(outputDir, "ic_launcher_round.png"));

      console.log(`✓ Generados iconos para ${folder} (${size}x${size}px)`);
    } catch (error) {
      console.error(`✗ Error generando iconos para ${folder}:`, error.message);
    }
  }
}

async function generateIOSIcon() {
  console.log("Generando icono para iOS...");

  const outputDir = path.join(
    __dirname,
    "../ios/App/App/Assets.xcassets/AppIcon.appiconset"
  );

  // Asegurar que el directorio existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    await sharp(SVG_PATH)
      .resize(IOS_SIZE, IOS_SIZE, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toFile(path.join(outputDir, "AppIcon-512@2x.png"));

    console.log(`✓ Generado icono para iOS (${IOS_SIZE}x${IOS_SIZE}px)`);
  } catch (error) {
    console.error(`✗ Error generando icono para iOS:`, error.message);
  }
}

async function generateAndroidSplashScreens() {
  console.log("Generando splash screens para Android...");

  // Tamaño del logo en los splash screens (aproximadamente 25% del ancho)
  const getLogoSize = (screenWidth) => Math.round(screenWidth * 0.25);

  for (const [folder, dimensions] of Object.entries(ANDROID_SPLASH_SIZES)) {
    const outputDir = path.join(
      __dirname,
      `../android/app/src/main/res/${folder}`
    );

    // Asegurar que el directorio existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      const { width, height } = dimensions;
      const logoSize = getLogoSize(Math.min(width, height));
      const logoBuffer = await sharp(SVG_PATH)
        .resize(logoSize, logoSize, { fit: "contain" })
        .png()
        .toBuffer();

      // Crear splash screen con logo centrado sobre fondo blanco
      await sharp({
        create: {
          width,
          height,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .composite([
          {
            input: logoBuffer,
            top: Math.round((height - logoSize) / 2),
            left: Math.round((width - logoSize) / 2),
          },
        ])
        .png()
        .toFile(path.join(outputDir, "splash.png"));

      console.log(
        `✓ Generado splash screen para ${folder} (${width}x${height}px)`
      );
    } catch (error) {
      console.error(
        `✗ Error generando splash screen para ${folder}:`,
        error.message
      );
    }
  }
}

async function generateIOSSplashScreens() {
  console.log("Generando splash screens para iOS...");

  const outputDir = path.join(
    __dirname,
    "../ios/App/App/Assets.xcassets/Splash.imageset"
  );

  // Asegurar que el directorio existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Tamaño del logo en los splash screens (aproximadamente 25% del tamaño)
  const getLogoSize = (screenSize) => Math.round(screenSize * 0.25);

  for (const [filename, size] of Object.entries(IOS_SPLASH_SIZES)) {
    try {
      const logoSize = getLogoSize(size);
      const logoBuffer = await sharp(SVG_PATH)
        .resize(logoSize, logoSize, { fit: "contain" })
        .png()
        .toBuffer();

      // Crear splash screen con logo centrado sobre fondo blanco
      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .composite([
          {
            input: logoBuffer,
            top: Math.round((size - logoSize) / 2),
            left: Math.round((size - logoSize) / 2),
          },
        ])
        .png()
        .toFile(path.join(outputDir, filename));

      console.log(`✓ Generado splash screen ${filename} (${size}x${size}px)`);
    } catch (error) {
      console.error(
        `✗ Error generando splash screen ${filename}:`,
        error.message
      );
    }
  }
}

async function main() {
  // Verificar que el SVG existe
  if (!fs.existsSync(SVG_PATH)) {
    console.error(`✗ No se encontró el archivo SVG en: ${SVG_PATH}`);
    process.exit(1);
  }

  console.log(`Usando SVG: ${SVG_PATH}\n`);

  await generateAndroidIcons();
  console.log("");
  await generateIOSIcon();
  console.log("");
  await generateAndroidSplashScreens();
  console.log("");
  await generateIOSSplashScreens();

  console.log(
    "\n✓ Todos los iconos y splash screens han sido generados exitosamente!"
  );
}

main().catch(console.error);
