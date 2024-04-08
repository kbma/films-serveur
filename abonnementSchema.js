const mongoose = require('mongoose');

const Film = require('./filmSchema');
const User = require('./userSchema'); 

const abonnementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Référence à l'utilisateur
  filmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Film' }, // Référence au film
  favori: { type: Boolean, default: false }, // Indique si le film est favori
  vu: { type: Boolean, default: false }, // Indique si l'utilisateur a vu le film
  aVoir: { type: Boolean, default: true } // Indique si l'utilisateur veut voir le film
});





const Abonnement = mongoose.model('abonnement', abonnementSchema);

module.exports = Abonnement;