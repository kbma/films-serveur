const mongoose = require('mongoose');

const filmSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  titre: { type: String, required: true },
  titreOriginal: { type: String },
  réalisateurs: { type: String },
  annéeProduction: { type: Number },
  nationalité: { type: String },
  durée: { type: String },
  genre: { type: String },
  synopsis: { type: String }
});

const Film = mongoose.model('films', filmSchema);

module.exports = Film;
