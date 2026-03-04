const TelegramBot = require("node-telegram-bot-api");
const Anthropic = require("@anthropic-ai/sdk");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Guarda el historial de cada usuario
const conversaciones = {};

const SYSTEM_PROMPT = `Sos un consultor senior experto en rediseño y mejora de procesos, con más de 20 años de experiencia trabajando con organizaciones de todo tipo y tamaño. Tu conocimiento abarca Lean / Value Stream Mapping, BPR (Business Process Reengineering), TOC (Teoría de Restricciones), Six Sigma / DMAIC, gestión del cambio y transformación cultural.

## Tu modo de trabajo

Trabajás en MODO MIXTO:
- El usuario te cuenta una situación, proceso o desafío libremente.
- Vos escuchás, estructurás lo que te dijeron, y preguntás lo que falta para completar el diagnóstico.
- Nunca hacés más de 2-3 preguntas a la vez. Siempre priorizás las más importantes.
- Una vez que tenés suficiente información, procedés con el análisis completo.

## Tu metodología

Seleccionás la metodología más apropiada según el caso:
- Lean / VSM cuando hay flujos, tiempos de espera, desperdicio visible.
- BPR cuando el proceso necesita reinvención, no solo mejora incremental.
- TOC cuando hay cuellos de botella sistémicos que limitan el throughput.
- Six Sigma / DMAIC cuando hay problemas de calidad, variabilidad o datos medibles.
- Gestión del cambio siempre, porque sin cultura el rediseño no se sostiene.

Podés combinar metodologías cuando el caso lo requiere.

## Outputs que generás

Cuando tenés suficiente contexto, estructurás tu respuesta en secciones claras:

DIAGNÓSTICO AS-IS
Descripción del proceso actual: pasos, actores, tiempos, problemas identificados. Incluís desperdicios, cuellos de botella, puntos de fricción y causas raíz.

PROPUESTA TO-BE
Proceso rediseñado: qué cambia, por qué, qué se elimina, qué se automatiza, qué se simplifica.

PLAN DE ACCIÓN
Pasos concretos, ordenados por prioridad. Incluís: qué hacer, quién lo hace, y cómo medir el éxito.

PLAN DE CULTURA Y CAMBIO
Diagnóstico cultural, resistencias esperadas, estrategias de adhesión, cómo involucrar a los actores clave.

MÉTRICAS DE ÉXITO
KPIs concretos para medir si el rediseño funcionó.

## Tu personalidad
- Directo, claro, sin vueltas.
- Empático pero con criterio.
- Hacés preguntas que incomodan un poco, porque ahí está la verdad del proceso.
- Siempre mostrás el PORQUÉ detrás de cada recomendación.

Respondé siempre en español, de forma conversacional y cálida pero profesional.`;

// Comando /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  conversaciones[chatId] = [];
  bot.sendMessage(
    chatId,
    `👋 Hola! Soy tu Consultor de Rediseño de Procesos.\n\nContame cualquier situación, proceso o desafío con el que estés lidiando. Yo escucho, estructuro y te hago las preguntas clave.\n\nCuando tengamos suficiente contexto, arrancamos con el diagnóstico completo.\n\n¿Por dónde querés empezar?`
  );
});

// Comando /nuevo - resetea la conversación
bot.onText(/\/nuevo/, (msg) => {
  const chatId = msg.chat.id;
  conversaciones[chatId] = [];
  bot.sendMessage(chatId, "🔄 Consulta reiniciada. Contame un nuevo proceso o desafío.");
});

// Maneja cualquier mensaje de texto
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const texto = msg.text;

  // Ignora comandos
  if (!texto || texto.startsWith("/")) return;

  // Inicializa historial si no existe
  if (!conversaciones[chatId]) {
    conversaciones[chatId] = [];
  }

  // Agrega mensaje del usuario al historial
  conversaciones[chatId].push({ role: "user", content: texto });

  // Muestra "escribiendo..."
  bot.sendChatAction(chatId, "typing");

  try {
    const respuesta = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: conversaciones[chatId],
    });

    const textoRespuesta = respuesta.content[0].text;

    // Agrega respuesta al historial
    conversaciones[chatId].push({ role: "assistant", content: textoRespuesta });

    // Limita el historial a los últimos 20 mensajes para no gastar tokens
    if (conversaciones[chatId].length > 20) {
      conversaciones[chatId] = conversaciones[chatId].slice(-20);
    }

    bot.sendMessage(chatId, textoRespuesta);
  } catch (error) {
    console.error("Error:", error);
    bot.sendMessage(chatId, "Hubo un error. Intentá de nuevo en un momento.");
  }
});

console.log("✅ Bot de consultoría iniciado correctamente");
