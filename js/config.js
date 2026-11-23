/* Configurações gerais do aplicativo (valores usados pelas telas).
   As regras de negócio também são validadas na camada de dados (js/api.js ou servidor). */
(function () {
  'use strict';
  var Fideliza = (window.Fideliza = window.Fideliza || {});

  Fideliza.config = {
    NOME_APP: 'Fideliza',
    NOME_LOJA: 'Loja Exemplo',
    LIMITE_MARCACOES: 10, // RN02: até 10 marcações por cartão
    DESCONTO_CUPOM: 100, // RN05: cupom de 100% de desconto em um produto
    VALIDADE_QR_MINUTOS: 5, // tempo de validade do QR Code de uma compra
    TAMANHO_SENHA_MINIMO: 6
  };
})();
