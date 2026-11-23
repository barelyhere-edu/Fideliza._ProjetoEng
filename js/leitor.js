/* Leitor de QR Code pela câmera (biblioteca jsQR).
   A câmera só é liberada pelo navegador em conexão segura (https) ou em
   localhost. Quando ela não está disponível, a tela oferece o campo de código. */
(function () {
  'use strict';
  var Fideliza = (window.Fideliza = window.Fideliza || {});

  var fluxo = null; // MediaStream da câmera
  var temporizador = null;
  var ativo = false;

  var leitor = (Fideliza.leitor = {});

  /** Diz se o navegador permite usar a câmera nesta página. */
  leitor.disponivel = function () {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.isSecureContext !== false);
  };

  /**
   * Liga a câmera e procura um QR Code nos quadros do vídeo.
   * @param {HTMLVideoElement} video elemento onde a imagem aparece
   * @param {function(string)} aoLer chamada uma vez, com o texto do QR Code
   * @returns {Promise<void>} rejeita se a câmera não puder ser usada
   */
  leitor.iniciar = function (video, aoLer) {
    leitor.parar();
    if (!leitor.disponivel()) {
      return Promise.reject(new Error('CAMERA_INDISPONIVEL'));
    }
    ativo = true;
    return navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then(function (stream) {
        if (!ativo) {
          // a pessoa saiu da tela antes de a câmera abrir
          stream.getTracks().forEach(function (faixa) {
            faixa.stop();
          });
          return;
        }
        fluxo = stream;
        video.srcObject = stream;
        video.setAttribute('playsinline', '');
        video.muted = true;
        var tocando = video.play();
        if (tocando && tocando.catch) tocando.catch(function () {});

        var tela = document.createElement('canvas');
        var contexto = tela.getContext('2d', { willReadFrequently: true });

        temporizador = setInterval(function () {
          if (!ativo || video.readyState < 2 || !video.videoWidth) return;
          // reduz a imagem para a leitura ficar rápida mesmo em celulares simples
          var escala = Math.min(1, 480 / Math.max(video.videoWidth, video.videoHeight));
          tela.width = Math.round(video.videoWidth * escala);
          tela.height = Math.round(video.videoHeight * escala);
          contexto.drawImage(video, 0, 0, tela.width, tela.height);
          var imagem = contexto.getImageData(0, 0, tela.width, tela.height);
          var resultado = window.jsQR(imagem.data, imagem.width, imagem.height, { inversionAttempts: 'dontInvert' });
          if (resultado && resultado.data) {
            leitor.parar();
            aoLer(resultado.data);
          }
        }, 160);
      })
      .catch(function (e) {
        ativo = false;
        throw e;
      });
  };

  /** Desliga a câmera (chamada sempre que a pessoa sai da tela do leitor). */
  leitor.parar = function () {
    ativo = false;
    if (temporizador) {
      clearInterval(temporizador);
      temporizador = null;
    }
    if (fluxo) {
      fluxo.getTracks().forEach(function (faixa) {
        faixa.stop();
      });
      fluxo = null;
    }
  };
})();
