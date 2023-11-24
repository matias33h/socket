const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Conéctate a tu base de datos MongoDB (asegúrate de reemplazar la URL con tu propia conexión)
mongoose.connect('mongodb+srv://angelito_rockerito:LRsVXSoG5i85y5GI@angelito.icmhpbi.mongodb.net/chatdb', { useNewUrlParser: true, useUnifiedTopology: true });

// Verificar la conexión a MongoDB
const db = mongoose.connection;
db.on('error', (error) => {
    console.error('Error de conexión a MongoDB:', error);
});
db.once('open', async () => {
    try {
        // Intentar crear la colección si no existe
        const collection = await db.db.createCollection('mensajes');
        console.log('Colección "mensajes" creada correctamente');
    } catch (err) {
        // La colección ya existe
        console.log('La colección "mensajes" ya existe');
    }
});

// Define el esquema para los mensajes
const mensajeSchema = new mongoose.Schema({
    usuario: String,
    mensaje: String,
    fecha: { type: Date, default: Date.now }
});

// Crea el modelo de Mensaje
const Mensaje = mongoose.model('Mensaje', mensajeSchema);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', async (socket) => {
    try {
        // Emitir mensajes almacenados al conectarse desde la base de datos
        const mensajes = await Mensaje.find().sort({ fecha: 1 });
        socket.emit('mensajes', mensajes);
    } catch (err) {
        console.error(err);
    }

    socket.on('nuevoUsuario', (usuario) => {
        socket.username = usuario;
        io.emit('usuarioConectado', usuario);
    });

    socket.on('enviarMensaje', async (mensaje) => {
        try {
            const nuevoMensaje = new Mensaje({ usuario: mensaje.usuario, mensaje: mensaje.mensaje });
            await nuevoMensaje.save();
            io.emit('nuevoMensaje', mensaje);
        } catch (err) {
            console.error(err);
        }
    });

    socket.on('escribiendo', () => {
        socket.broadcast.emit('usuarioEscribiendo', socket.username);
    });

    socket.on('finEscribir', () => {
        socket.broadcast.emit('usuarioFinEscribir', socket.username);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
