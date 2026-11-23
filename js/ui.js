/* Funções utilitárias de interface: formatação, QR Code em SVG, avisos e máscaras. */
(function () {
  'use strict';
  var Fideliza = (window.Fideliza = window.Fideliza || {});
  var ui = (Fideliza.ui = {});

  /** Escapa texto antes de colocá-lo em HTML (evita injeção de código). */
  ui.esc = function (valor) {
    return String(valor === null || valor === undefined ? '' : valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  function doisDigitos(n) {
    return (n < 10 ? '0' : '') + n;
  }

  /** "23/11/2026" */
  ui.data = function (iso) {
    var d = new Date(iso);
    return doisDigitos(d.getDate()) + '/' + doisDigitos(d.getMonth() + 1) + '/' + d.getFullYear();
  };
  /** "23/11" */
  ui.dataCurta = function (iso) {
    var d = new Date(iso);
    return doisDigitos(d.getDate()) + '/' + doisDigitos(d.getMonth() + 1);
  };
  /** "14:05" */
  ui.hora = function (iso) {
    var d = new Date(iso);
    return doisDigitos(d.getHours()) + ':' + doisDigitos(d.getMinutes());
  };
  ui.dataHora = function (iso) {
    return ui.data(iso) + ' ' + ui.hora(iso);
  };
  /** "segunda-feira, 23 de novembro" */
  ui.dataPorExtenso = function (data) {
    var dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    var meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    var d = data || new Date();
    return dias[d.getDay()] + ', ' + d.getDate() + ' de ' + meses[d.getMonth()];
  };
  /** "R$ 12,50" (ou travessão quando o valor não foi informado) */
  ui.moeda = function (valor) {
    if (valor === null || valor === undefined || valor === '') return '—';
    var n = Number(valor);
    if (!isFinite(n)) return '—';
    var partes = n.toFixed(2).split('.');
    var inteiro = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return 'R$ ' + inteiro + ',' + partes[1];
  };
  ui.primeiroNome = function (nome) {
    return String(nome || '').trim().split(/\s+/)[0] || '';
  };

  /** Converte "12,50" ou "12.50" em número. Devolve null se vazio e NaN se inválido. */
  ui.lerValor = function (texto) {
    var limpo = String(texto || '').trim().replace(/^R\$\s*/i, '');
    if (!limpo) return null;
    if (limpo.indexOf(',') >= 0) limpo = limpo.replace(/\./g, '').replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return NaN;
    return Number(limpo);
  };

  /** Aplica a máscara 00.000.000/0000-00 enquanto a pessoa digita o CNPJ. */
  ui.mascaraCnpj = function (texto) {
    var d = String(texto || '').replace(/\D/g, '').slice(0, 14);
    var saida = d.slice(0, 2);
    if (d.length > 2) saida += '.' + d.slice(2, 5);
    if (d.length > 5) saida += '.' + d.slice(5, 8);
    if (d.length > 8) saida += '/' + d.slice(8, 12);
    if (d.length > 12) saida += '-' + d.slice(12, 14);
    return saida;
  };

  /** Deixa o código no formato usado pelo sistema: maiúsculas, sem espaços. */
  ui.normalizarCodigo = function (texto) {
    return String(texto || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  };

  /**
   * Extrai o código de uma leitura de QR Code. O QR Code da compra guarda um
   * endereço do tipo ".../#/marcar/ABC123"; se vier só o código, usa o próprio texto.
   */
  ui.codigoDaLeitura = function (texto) {
    var m = /#\/marcar\/([A-Za-z0-9]+)/.exec(String(texto || ''));
    return ui.normalizarCodigo(m ? m[1] : texto);
  };

  /** Gera o SVG de um QR Code a partir de um texto (biblioteca qrcode-generator). */
  ui.qrSvg = function (texto, titulo) {
    var qr = window.qrcode(0, 'M');
    qr.addData(String(texto));
    qr.make();
    var n = qr.getModuleCount();
    var margem = 2;
    var total = n + margem * 2;
    var caminho = '';
    for (var linha = 0; linha < n; linha++) {
      for (var coluna = 0; coluna < n; coluna++) {
        if (qr.isDark(linha, coluna)) {
          caminho += 'M' + (coluna + margem) + ' ' + (linha + margem) + 'h1v1h-1z';
        }
      }
    }
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total + '" ' +
      'shape-rendering="crispEdges" role="img" aria-label="' + ui.esc(titulo || 'QR Code') + '">' +
      '<rect width="' + total + '" height="' + total + '" fill="#ffffff"/>' +
      '<path d="' + caminho + '" fill="#000000"/></svg>'
    );
  };

  /** Aviso rápido no rodapé (somente informações secundárias). */
  ui.aviso = function (texto) {
    var area = document.getElementById('avisos');
    if (!area) return;
    var el = document.createElement('div');
    el.className = 'aviso';
    el.textContent = texto;
    area.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 4000);
  };

  /** Bloco de mensagem na própria tela. tipo: 'erro' | 'sucesso' | 'aviso' | '' */
  ui.mensagem = function (tipo, titulo, texto) {
    var icones = { erro: 'circle-alert', sucesso: 'circle-check', aviso: 'info' };
    return (
      '<div class="mensagem' + (tipo ? ' mensagem-' + tipo : '') + '" role="' + (tipo === 'erro' ? 'alert' : 'status') + '">' +
      Fideliza.icone(icones[tipo] || 'info', 20) +
      '<div>' + (titulo ? '<strong>' + ui.esc(titulo) + '</strong>' : '') + (texto ? ui.esc(texto) : '') + '</div></div>'
    );
  };

  /** Mostra (ou limpa) uma mensagem dentro de um elemento reservado para isso. */
  ui.mostrarMensagem = function (elemento, tipo, titulo, texto) {
    if (!elemento) return;
    elemento.innerHTML = titulo || texto ? ui.mensagem(tipo, titulo, texto) : '';
  };

  /** Liga/desliga o estado "enviando" de um botão de formulário. */
  ui.ocupado = function (botao, ocupado, textoOcupado) {
    if (!botao) return;
    if (ocupado) {
      botao.setAttribute('data-texto-original', botao.innerHTML);
      botao.disabled = true;
      botao.textContent = textoOcupado || 'Aguarde…';
    } else {
      botao.disabled = false;
      var original = botao.getAttribute('data-texto-original');
      if (original !== null) botao.innerHTML = original;
    }
  };

  /** Esqueleto mostrado enquanto os dados carregam. */
  ui.esqueleto = function () {
    return (
      '<div class="tela" aria-busy="true" aria-label="Carregando">' +
      '<div class="esqueleto esqueleto-titulo"></div>' +
      '<div class="esqueleto esqueleto-linha"></div>' +
      '<div class="esqueleto esqueleto-bloco"></div>' +
      '<div class="esqueleto esqueleto-linha"></div></div>'
    );
  };

  /** Baixa um texto como arquivo (usado para salvar o QR Code do cartaz em SVG). */
  ui.baixarTexto = function (nomeArquivo, conteudo, tipo) {
    var blob = new Blob([conteudo], { type: tipo || 'text/plain' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  };
})();
