/* Telas do cliente: início, cartão fidelidade e leitor de QR Code. */
(function () {
  'use strict';
  var Fideliza = (window.Fideliza = window.Fideliza || {});
  var ui = Fideliza.ui;
  var icone = Fideliza.icone;
  var cfg = Fideliza.config;
  var telas = (Fideliza.telas = Fideliza.telas || {});

  function plural(n, um, varios) {
    return n + ' ' + (n === 1 ? um : varios);
  }

  function barraDeProgresso(total, limite) {
    return (
      '<div class="barra" role="progressbar" aria-label="Progresso do cartão" aria-valuemin="0" aria-valuemax="' + limite +
      '" aria-valuenow="' + total + '"><div class="barra-valor" style="width:' + Math.round((total / limite) * 100) + '%"></div></div>'
    );
  }

  /** Bilhete do cupom de 100%. */
  function cupomHtml(cupom) {
    var usado = cupom.status === 'utilizado';
    return (
      '<article class="cupom' + (usado ? ' utilizado' : '') + '" aria-label="Cupom ' + ui.esc(cupom.codigo) + '">' +
      '<div class="cupom-valor"><span class="cupom-numero">' + cfg.DESCONTO_CUPOM + '%</span><span class="cupom-legenda">de desconto</span></div>' +
      '<div class="cupom-corpo">' +
      '<p class="cupom-descricao">' + (usado ? 'Cupom já utilizado.' : 'Vale um produto. Mostre este código ao vendedor.') + '</p>' +
      '<span class="cupom-codigo">' + ui.esc(cupom.codigo) + '</span>' +
      '<span class="cupom-situacao">' +
      (usado ? 'Utilizado em ' + ui.dataHora(cupom.utilizadoEm) : 'Disponível desde ' + ui.data(cupom.geradoEm)) +
      '</span></div></article>'
    );
  }

  /** Desenha o cartão com as 10 posições de marcação. */
  function cartaoHtml(cartao, indiceNovo) {
    var total = cartao.marcacoes.length;
    var selos = '';
    for (var i = 0; i < cartao.limite; i++) {
      var marcacao = cartao.marcacoes[i];
      var ultimo = i === cartao.limite - 1;
      var conteudo = marcacao ? icone(ultimo ? 'gift' : 'check', 24) : ultimo ? icone('gift', 22) : String(i + 1);
      selos +=
        '<li class="selo' + (marcacao ? ' marcado' : '') + (i === indiceNovo ? ' novo' : '') + '">' +
        '<span class="selo-marca" aria-hidden="true">' + conteudo + '</span>' +
        '<span class="selo-data numeros" aria-hidden="true">' + (marcacao ? ui.dataCurta(marcacao.dataHora) : '') + '</span>' +
        '<span class="so-leitor">Marcação ' + (i + 1) + ': ' + (marcacao ? 'feita em ' + ui.data(marcacao.dataHora) : 'vazia') + '</span>' +
        '</li>';
    }
    var faltam = cartao.limite - total;
    return (
      '<article class="cartao-fidelidade">' +
      '<div class="cartao-topo"><span class="cartao-loja">' + ui.esc(cfg.NOME_LOJA) + '</span>' +
      '<span class="etiqueta numeros">Cartão nº ' + cartao.numero + '</span></div>' +
      '<h1 class="cartao-titulo">Cartão fidelidade</h1>' +
      '<ol class="selos" aria-label="Marcações do cartão">' + selos + '</ol>' +
      '<div class="cartao-progresso">' +
      '<div class="cartao-progresso-texto"><strong class="numeros">' + total + ' de ' + cartao.limite + ' marcações</strong>' +
      '<span>' + (faltam > 0 ? 'Faltam ' + faltam : 'Completo') + '</span></div>' +
      barraDeProgresso(total, cartao.limite) +
      '</div>' +
      '<p class="cartao-regra">Complete ' + cartao.limite + ' marcações e ganhe um cupom de ' + cfg.DESCONTO_CUPOM + '% de desconto em um produto.</p>' +
      '</article>'
    );
  }

  /* ------------------------------------------------------ Início do cliente */
  telas.clienteInicio = {
    rota: 'cliente',
    titulo: 'Início',
    perfis: ['cliente'],
    carrega: true,
    render: function (ctx) {
      return Fideliza.api.cartao().then(function (dados) {
        var cartao = dados.cartao;
        var total = cartao.marcacoes.length;
        var faltam = cartao.limite - total;
        var disponiveis = dados.cupons.filter(function (c) {
          return c.status === 'disponivel';
        }).length;
        return (
          '<section class="tela">' +
          '<div class="topo-tela">' +
          '<p class="sobretitulo">' + ui.esc(cfg.NOME_LOJA) + '</p>' +
          '<h1>Olá, ' + ui.esc(ui.primeiroNome(ctx.usuario.nome)) + '</h1>' +
          '</div>' +
          '<div class="resumo-cartao">' +
          '<p><strong class="numeros">' + total + ' de ' + cartao.limite + '</strong> marcações no cartão atual</p>' +
          barraDeProgresso(total, cartao.limite) +
          '<p class="ajuda">' +
          (faltam > 0
            ? (faltam === 1 ? 'Falta 1 compra' : 'Faltam ' + faltam + ' compras') + ' para o cupom de ' + cfg.DESCONTO_CUPOM + '%.'
            : 'Cartão completo. Inicie um novo cartão em “Meu cartão”.') +
          '</p></div>' +
          (disponiveis
            ? '<a class="mensagem mensagem-sucesso" href="#/cliente/cartao" style="text-decoration:none">' + icone('ticket', 20) +
              '<div><strong>Você tem ' + plural(disponiveis, 'cupom disponível', 'cupons disponíveis') + '</strong>Toque para ver o código do cupom de ' + cfg.DESCONTO_CUPOM + '%.</div></a>'
            : '') +
          '<div class="pilha">' +
          '<a class="botao-grande botao-grande-principal" href="#/cliente/leitor">' + icone('scan-line', 30) +
          '<span><span class="botao-grande-titulo">Ler QR Code</span><span class="botao-grande-descricao">Marcar uma compra feita na loja</span></span>' +
          '<span class="botao-grande-seta">' + icone('arrow-left', 20) + '</span></a>' +
          '<a class="botao-grande" href="#/cliente/cartao">' + icone('credit-card', 30) +
          '<span><span class="botao-grande-titulo">Meu cartão</span><span class="botao-grande-descricao">Ver marcações e cupons</span></span>' +
          '<span class="botao-grande-seta">' + icone('arrow-left', 20) + '</span></a>' +
          '</div>' +
          '</section>'
        );
      });
    }
  };

  /* ------------------------------------------------------ Cartão fidelidade */
  telas.clienteCartao = {
    rota: 'cliente/cartao',
    titulo: 'Meu cartão',
    perfis: ['cliente'],
    carrega: true,
    render: function (ctx) {
      return Fideliza.api.cartao().then(function (dados) {
        var cartao = dados.cartao;
        var total = cartao.marcacoes.length;
        var novidade = ctx.novidade; // preenchida logo depois de uma marcação
        var topo = '';
        if (novidade && novidade.cupom) {
          topo =
            '<div class="comemoracao" role="status">' +
            '<h2>Cartão completo!</h2>' +
            '<p>Você ganhou um cupom de ' + cfg.DESCONTO_CUPOM + '% de desconto em um produto. O código está logo abaixo, em “Meus cupons”.</p>' +
            '</div>';
        } else if (novidade) {
          topo = ui.mensagem('sucesso', 'Compra marcada', 'Seu cartão agora tem ' + total + ' de ' + cartao.limite + ' marcações.');
        }
        var acao =
          cartao.status === 'completo'
            ? '<div id="retorno"></div><button class="botao botao-primario botao-largo" type="button" id="novo-cartao">' + icone('rotate-ccw') + 'Iniciar novo cartão</button>'
            : '<a class="botao botao-primario botao-largo" href="#/cliente/leitor">' + icone('scan-line') + 'Adicionar compra</a>';
        var cupons = dados.cupons.length
          ? '<div class="pilha">' + dados.cupons.map(cupomHtml).join('') + '</div>'
          : '<div class="vazio">' + icone('ticket', 28) + '<strong>Nenhum cupom ainda</strong>' +
            '<span>Quando o cartão chegar a ' + cartao.limite + ' marcações, seu cupom de ' + cfg.DESCONTO_CUPOM + '% aparece aqui.</span></div>';
        return (
          '<section class="tela">' +
          '<a class="voltar" href="#/cliente">' + icone('arrow-left', 18) + 'Início</a>' +
          topo +
          cartaoHtml(cartao, novidade ? total - 1 : -1) +
          acao +
          '<section class="secao" aria-labelledby="titulo-cupons"><h2 id="titulo-cupons">Meus cupons</h2>' + cupons + '</section>' +
          '</section>'
        );
      });
    },
    montar: function (raiz, ctx) {
      var botao = raiz.querySelector('#novo-cartao');
      if (!botao) return;
      botao.addEventListener('click', function () {
        ui.ocupado(botao, true, 'Criando cartão…');
        Fideliza.api
          .novoCartao()
          .then(function () {
            ctx.recado('sucesso', 'Novo cartão iniciado', 'Suas próximas compras já contam neste cartão.');
            ctx.recarregar();
          })
          .catch(function (e) {
            ui.ocupado(botao, false);
            ui.mostrarMensagem(raiz.querySelector('#retorno'), 'erro', 'Não foi possível iniciar o cartão', e.message);
          });
      });
    }
  };

  /* ------------------------------------------------------ Leitor de QR Code */
  telas.clienteLeitor = {
    rota: 'cliente/leitor',
    titulo: 'Ler QR Code',
    perfis: ['cliente'],
    render: function () {
      return (
        '<section class="tela">' +
        '<a class="voltar" href="#/cliente">' + icone('arrow-left', 18) + 'Início</a>' +
        '<div class="topo-tela">' +
        '<h1>Ler QR Code</h1>' +
        '<p class="apoio">Aponte a câmera para o QR Code mostrado pelo vendedor ou digite o código.</p>' +
        '</div>' +
        '<div class="visor" id="visor">' +
        '<video id="video" hidden aria-label="Imagem da câmera"></video>' +
        '<div class="visor-mira" id="mira" hidden></div>' +
        '<div class="visor-estado" id="visor-estado"></div>' +
        '<div class="visor-legenda" id="visor-legenda" hidden>Procurando QR Code…</div>' +
        '</div>' +
        '<form class="formulario" id="form-codigo" novalidate>' +
        '<div class="campo campo-codigo"><label for="codigo">Código</label>' +
        '<input id="codigo" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="6" placeholder="Digite o código" /></div>' +
        '<div id="retorno"></div>' +
        '<button class="botao botao-primario botao-largo" type="submit">Confirmar</button>' +
        '</form>' +
        '<a class="botao botao-secundario botao-largo" href="#/cliente/cartao">' + icone('credit-card') + 'Ver meu cartão</a>' +
        '</section>'
      );
    },
    montar: function (raiz, ctx) {
      var video = raiz.querySelector('#video');
      var mira = raiz.querySelector('#mira');
      var estado = raiz.querySelector('#visor-estado');
      var legenda = raiz.querySelector('#visor-legenda');
      var form = raiz.querySelector('#form-codigo');
      var campo = raiz.querySelector('#codigo');
      var retorno = raiz.querySelector('#retorno');
      var enviando = false;

      function mostrarEstado(html) {
        video.hidden = true;
        mira.hidden = true;
        legenda.hidden = true;
        estado.hidden = false;
        estado.innerHTML = html;
        var tentar = estado.querySelector('#tentar-camera');
        if (tentar) tentar.addEventListener('click', ligarCamera);
      }

      function ligarCamera() {
        if (!Fideliza.leitor.disponivel()) {
          mostrarEstado(
            icone('camera', 32) +
              '<span>O navegador só libera a câmera em conexão segura (https) ou em localhost. ' +
              'Digite o código abaixo ou abra o QR Code com a câmera do celular.</span>'
          );
          return;
        }
        mostrarEstado(icone('camera', 32) + '<span>Abrindo a câmera…</span>');
        Fideliza.leitor
          .iniciar(video, function (texto) {
            var lido = ui.codigoDaLeitura(texto);
            if (!/^[A-Z0-9]{6}$/.test(lido)) {
              // outro QR Code (o do cartaz da loja, por exemplo): avisa e continua procurando
              ui.mostrarMensagem(retorno, 'aviso', 'Este QR Code não é de uma compra', 'Aponte para o QR Code que o vendedor mostra depois de confirmar a compra.');
              setTimeout(function () {
                if (!enviando && raiz.contains(video)) ligarCamera();
              }, 2500);
              return;
            }
            enviar(lido, true);
          })
          .then(function () {
            estado.hidden = true;
            video.hidden = false;
            mira.hidden = false;
            legenda.hidden = false;
          })
          .catch(function () {
            mostrarEstado(
              icone('camera', 32) +
                '<span>Não foi possível usar a câmera. Verifique a permissão do navegador ou digite o código abaixo.</span>' +
                '<button class="botao" type="button" id="tentar-camera">Tentar novamente</button>'
            );
          });
      }

      function enviar(codigo, veioDaCamera) {
        if (enviando) return;
        if (!codigo) {
          ui.mostrarMensagem(retorno, 'erro', 'Informe o código', 'Digite os 6 caracteres mostrados na tela do vendedor.');
          campo.focus();
          return;
        }
        enviando = true;
        var botao = form.querySelector('button[type="submit"]');
        ui.mostrarMensagem(retorno);
        ui.ocupado(botao, true, 'Registrando marcação…');
        Fideliza.api
          .marcar(codigo)
          .then(function (dados) {
            ctx.definirNovidade({ cupom: dados.cupomGerado || null });
            ctx.navegar('cliente/cartao');
          })
          .catch(function (e) {
            enviando = false;
            ui.ocupado(botao, false);
            ui.mostrarMensagem(retorno, 'erro', 'Marcação não registrada', e.message);
            if (veioDaCamera) {
              // volta a procurar outro código, se a pessoa continuar nesta tela
              setTimeout(function () {
                if (!enviando && raiz.contains(video)) ligarCamera();
              }, 2500);
            }
          });
      }

      campo.addEventListener('input', function () {
        campo.value = ui.normalizarCodigo(campo.value).replace(/-/g, '');
      });
      form.addEventListener('submit', function (evento) {
        evento.preventDefault();
        enviar(ui.codigoDaLeitura(campo.value), false);
      });

      ligarCamera();
    },
    desmontar: function () {
      Fideliza.leitor.parar();
    }
  };

  /* ---------------------------- Marcação pelo link do QR Code (#/marcar/XYZ) */
  telas.clienteMarcar = {
    rota: 'marcar/:codigo',
    titulo: 'Marcar compra',
    perfis: ['cliente'],
    carrega: true,
    render: function (ctx) {
      return Fideliza.api
        .marcar(ui.codigoDaLeitura(ctx.params.codigo))
        .then(function (dados) {
          ctx.definirNovidade({ cupom: dados.cupomGerado || null });
          ctx.navegar('cliente/cartao', true);
          return ui.esqueleto();
        })
        .catch(function (e) {
          if (e.codigo === 'NAO_AUTENTICADO') throw e;
          return (
            '<section class="tela">' +
            '<a class="voltar" href="#/cliente">' + icone('arrow-left', 18) + 'Início</a>' +
            '<div class="topo-tela"><h1>Marcação não registrada</h1></div>' +
            ui.mensagem('erro', '', e.message) +
            '<a class="botao botao-primario botao-largo" href="#/cliente/leitor">' + icone('scan-line') + 'Ler outro código</a>' +
            '<a class="botao botao-secundario botao-largo" href="#/cliente/cartao">' + icone('credit-card') + 'Ver meu cartão</a>' +
            '</section>'
          );
        });
    }
  };
})();
