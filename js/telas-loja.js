/* Telas da loja (vendedor e administrador): painel, QR Code da compra,
   validação de cupom, tabela de vendas e cartaz de acesso. */
(function () {
  'use strict';
  var Fideliza = (window.Fideliza = window.Fideliza || {});
  var ui = Fideliza.ui;
  var icone = Fideliza.icone;
  var cfg = Fideliza.config;
  var telas = (Fideliza.telas = Fideliza.telas || {});

  var NOME_PERFIL = { vendedor: 'Vendedor', administrador: 'Administrador' };

  /** Etiqueta com a situação de uma venda. */
  function etiquetaSituacao(venda) {
    if (venda.tipo === 'cupom') return '<span class="etiqueta etiqueta-destaque">Cupom ' + cfg.DESCONTO_CUPOM + '%</span>';
    if (venda.status === 'marcada') return '<span class="etiqueta etiqueta-sucesso">Marcada</span>';
    if (venda.status === 'pendente') return '<span class="etiqueta etiqueta-aviso">Aguardando leitura</span>';
    return '<span class="etiqueta">Expirada</span>';
  }

  function indicador(valor, rotulo, principal) {
    return (
      '<div class="indicador' + (principal ? ' principal' : '') + '"><span class="indicador-valor">' + ui.esc(valor) +
      '</span><span class="indicador-rotulo">' + ui.esc(rotulo) + '</span></div>'
    );
  }

  /* -------------------------------------------------------- Painel da loja */
  telas.lojaPainel = {
    rota: 'loja',
    titulo: 'Painel da loja',
    perfis: ['vendedor', 'administrador'],
    ampla: true,
    carrega: true,
    render: function (ctx) {
      return Fideliza.api.resumo().then(function (resumo) {
        var admin = ctx.usuario.perfil === 'administrador';
        var lista = resumo.ultimas.length
          ? '<ul class="lista">' +
            resumo.ultimas
              .map(function (v) {
                return (
                  '<li><span class="lista-hora numeros">' + ui.hora(v.dataHora) + '</span>' +
                  '<span class="lista-titulo">' + ui.esc(v.cliente || 'Cliente ainda não leu o código') + '</span>' +
                  etiquetaSituacao(v) + '</li>'
                );
              })
              .join('') +
            '</ul>'
          : '<div class="vazio">' + icone('receipt', 28) + '<strong>Nenhuma compra confirmada hoje</strong>' +
            '<span>Confirme a primeira compra do dia para gerar um QR Code.</span></div>';

        return (
          '<section class="tela">' +
          '<div class="topo-tela">' +
          '<p class="sobretitulo">' + ui.esc(cfg.NOME_LOJA) + ' · ' + NOME_PERFIL[ctx.usuario.perfil] + '</p>' +
          '<h1>Painel da loja</h1>' +
          '<p class="apoio">Hoje é ' + ui.dataPorExtenso() + '.</p>' +
          '</div>' +
          '<div class="grade-ampla">' +
          /* coluna 1: confirmar compra + atalhos */
          '<div class="pilha" style="gap:var(--esp-5)">' +
          '<section class="painel" aria-labelledby="titulo-confirmar">' +
          '<h2 id="titulo-confirmar">Confirmar compra</h2>' +
          '<form class="formulario" id="form-compra" novalidate>' +
          '<div class="campo"><label for="valor">Valor da compra <span class="campo-dica">(opcional)</span></label>' +
          '<input id="valor" type="text" inputmode="decimal" autocomplete="off" placeholder="R$ 0,00" maxlength="12" /></div>' +
          '<div id="retorno-compra"></div>' +
          '<button class="botao botao-primario botao-largo" type="submit">' + icone('qr-code') + 'Gerar QR Code</button>' +
          '</form>' +
          '<p class="ajuda">O código vale para uma única marcação e expira em ' + cfg.VALIDADE_QR_MINUTOS + ' minutos.</p>' +
          '</section>' +
          '<div class="pilha">' +
          (admin
            ? '<a class="botao-grande" href="#/loja/vendas">' + icone('table-2', 28) +
              '<span><span class="botao-grande-titulo">Tabela de vendas</span><span class="botao-grande-descricao">Histórico e marcações por dia</span></span>' +
              '<span class="botao-grande-seta">' + icone('arrow-left', 20) + '</span></a>'
            : '<div class="botao-grande bloqueado" aria-disabled="true">' + icone('lock', 28) +
              '<span><span class="botao-grande-titulo">Tabela de vendas</span><span class="botao-grande-descricao">Acesso restrito ao administrador</span></span><span></span></div>') +
          '<a class="botao-grande" href="#/loja/cupom">' + icone('ticket', 28) +
          '<span><span class="botao-grande-titulo">Validar cupom</span><span class="botao-grande-descricao">Dar baixa no cupom de ' + cfg.DESCONTO_CUPOM + '%</span></span>' +
          '<span class="botao-grande-seta">' + icone('arrow-left', 20) + '</span></a>' +
          '<a class="botao-grande" href="#/loja/cartaz">' + icone('printer', 28) +
          '<span><span class="botao-grande-titulo">Cartaz da loja</span><span class="botao-grande-descricao">QR Code de acesso para os clientes</span></span>' +
          '<span class="botao-grande-seta">' + icone('arrow-left', 20) + '</span></a>' +
          '</div>' +
          '</div>' +
          /* coluna 2: indicadores do dia + últimas confirmações */
          '<div class="pilha" style="gap:var(--esp-5)">' +
          '<section class="secao" aria-labelledby="titulo-hoje"><h2 id="titulo-hoje">Hoje</h2>' +
          '<div class="indicadores">' +
          indicador(resumo.marcacoesHoje, 'Marcações registradas', true) +
          indicador(resumo.cuponsGeradosHoje, 'Cupons gerados') +
          indicador(resumo.vendasComCupomHoje, 'Vendas com cupom') +
          '</div></section>' +
          '<section class="secao" aria-labelledby="titulo-ultimas"><h2 id="titulo-ultimas">Confirmações de hoje</h2>' + lista + '</section>' +
          '</div>' +
          '</div>' +
          '</section>'
        );
      });
    },
    montar: function (raiz, ctx) {
      var form = raiz.querySelector('#form-compra');
      if (!form) return;
      var retorno = raiz.querySelector('#retorno-compra');
      form.addEventListener('submit', function (evento) {
        evento.preventDefault();
        var valor = ui.lerValor(form.querySelector('#valor').value);
        if (valor !== null && (isNaN(valor) || valor <= 0)) {
          ui.mostrarMensagem(retorno, 'erro', 'Valor inválido', 'Use o formato 12,50 ou deixe o campo em branco.');
          return;
        }
        var botao = form.querySelector('button[type="submit"]');
        ui.mostrarMensagem(retorno);
        ui.ocupado(botao, true, 'Gerando código…');
        Fideliza.api
          .confirmarCompra(valor)
          .then(function (compra) {
            ctx.navegar('loja/qrcode/' + compra.id);
          })
          .catch(function (e) {
            ui.ocupado(botao, false);
            ui.mostrarMensagem(retorno, 'erro', 'Compra não confirmada', e.message);
          });
      });
    }
  };

  /* ------------------------------------------------- QR Code de uma compra */
  var relogio = null; // contagem regressiva
  var consulta = null; // consulta periódica da situação

  function pararAcompanhamento() {
    if (relogio) clearInterval(relogio);
    if (consulta) clearInterval(consulta);
    relogio = null;
    consulta = null;
  }

  function situacaoHtml(compra) {
    if (compra.status === 'marcada') {
      var c = compra.cliente || {};
      return (
        '<div class="situacao sucesso">' + icone('circle-check', 28) + '<div><strong>Compra marcada</strong>' +
        'Cartão de ' + ui.esc(c.nome || 'cliente') + ': ' + (c.marcacoes || 0) + ' de ' + (c.limite || cfg.LIMITE_MARCACOES) + ' marcações.' +
        (compra.cupomGerado ? ' Cartão completo: cupom de ' + cfg.DESCONTO_CUPOM + '% gerado.' : '') +
        '</div></div>'
      );
    }
    if (compra.status === 'expirada') {
      return (
        '<div class="situacao erro">' + icone('clock', 28) + '<div><strong>Código expirado</strong>' +
        'Nenhuma marcação foi registrada. Gere um novo código para esta compra.</div></div>'
      );
    }
    return (
      '<div class="situacao"><span class="pulso" aria-hidden="true"></span><div><strong>Aguardando o cliente</strong>' +
      'A marcação entra no cartão assim que o código for lido.</div></div>'
    );
  }

  telas.lojaQrCode = {
    rota: 'loja/qrcode/:id',
    titulo: 'QR Code da compra',
    perfis: ['vendedor', 'administrador'],
    carrega: true,
    render: function (ctx) {
      return Promise.all([Fideliza.api.statusCompra(ctx.params.id), Fideliza.api.urlBase()]).then(function (r) {
        var compra = r[0];
        var endereco = r[1] + '#/marcar/' + compra.codigo;
        ctx.dados = compra;
        return (
          '<section class="tela">' +
          '<a class="voltar" href="#/loja">' + icone('arrow-left', 18) + 'Voltar</a>' +
          '<div class="topo-tela"><h1>QR Code da compra</h1>' +
          '<p class="apoio">Peça para o cliente ler o código com o aplicativo' +
          (compra.valor ? ' para marcar a compra de ' + ui.moeda(compra.valor) : '') + '.</p></div>' +
          '<div class="qr-quadro' + (compra.status === 'pendente' ? '' : ' inativo') + '" id="qr">' + ui.qrSvg(endereco, 'QR Code da compra, código ' + compra.codigo) + '</div>' +
          '<div class="codigo-compra"><span class="rotulo">Código</span>' +
          '<span class="codigo-compra-valor">' + ui.esc(compra.codigo) + '</span>' +
          '<span class="ajuda numeros" id="validade"></span></div>' +
          '<div id="situacao" role="status" aria-live="polite">' + situacaoHtml(compra) + '</div>' +
          '<a class="botao botao-secundario botao-largo" href="#/loja">' + icone('qr-code') + 'Nova compra</a>' +
          '</section>'
        );
      });
    },
    montar: function (raiz, ctx) {
      var compra = ctx.dados;
      if (!compra) return;
      var validade = raiz.querySelector('#validade');
      var situacao = raiz.querySelector('#situacao');
      var quadro = raiz.querySelector('#qr');

      function atualizarValidade() {
        if (compra.status !== 'pendente') {
          validade.textContent = '';
          return;
        }
        var resta = Math.max(0, Math.round((new Date(compra.expiraEm).getTime() - Date.now()) / 1000));
        var seg = resta % 60;
        validade.textContent = 'Expira em ' + Math.floor(resta / 60) + ':' + (seg < 10 ? '0' : '') + seg;
      }
      function consultar() {
        Fideliza.api
          .statusCompra(compra.id)
          .then(function (atual) {
            if (atual.status === compra.status) return;
            compra = atual;
            situacao.innerHTML = situacaoHtml(compra);
            quadro.classList.toggle('inativo', compra.status !== 'pendente');
            atualizarValidade();
            if (compra.status !== 'pendente') pararAcompanhamento();
          })
          .catch(function () {
            /* falha momentânea de rede: tenta de novo na próxima consulta */
          });
      }

      pararAcompanhamento();
      atualizarValidade();
      if (compra.status === 'pendente') {
        relogio = setInterval(atualizarValidade, 1000);
        consulta = setInterval(consultar, 1500);
      }
    },
    desmontar: pararAcompanhamento
  };

  /* ------------------------------------------------------- Validar cupom */
  telas.lojaCupom = {
    rota: 'loja/cupom',
    titulo: 'Validar cupom',
    perfis: ['vendedor', 'administrador'],
    render: function () {
      return (
        '<section class="tela">' +
        '<a class="voltar" href="#/loja">' + icone('arrow-left', 18) + 'Voltar</a>' +
        '<div class="topo-tela"><h1>Validar cupom</h1>' +
        '<p class="apoio">Digite o código mostrado no aplicativo do cliente para dar baixa no cupom de ' + cfg.DESCONTO_CUPOM + '%.</p></div>' +
        '<form class="formulario" id="form-cupom" novalidate>' +
        '<div class="campo campo-codigo"><label for="cupom">Código do cupom</label>' +
        '<input id="cupom" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" placeholder="CUP-XXXXXX" /></div>' +
        '<div id="retorno"></div>' +
        '<button class="botao botao-primario botao-largo" type="submit">' + icone('badge-percent') + 'Validar cupom</button>' +
        '</form>' +
        '</section>'
      );
    },
    montar: function (raiz) {
      var form = raiz.querySelector('#form-cupom');
      var campo = raiz.querySelector('#cupom');
      var retorno = raiz.querySelector('#retorno');
      campo.addEventListener('input', function () {
        campo.value = ui.normalizarCodigo(campo.value);
      });
      form.addEventListener('submit', function (evento) {
        evento.preventDefault();
        if (!campo.value) {
          ui.mostrarMensagem(retorno, 'erro', 'Informe o código do cupom');
          campo.focus();
          return;
        }
        var botao = form.querySelector('button[type="submit"]');
        ui.mostrarMensagem(retorno);
        ui.ocupado(botao, true, 'Validando…');
        Fideliza.api
          .resgatarCupom(campo.value)
          .then(function (r) {
            ui.ocupado(botao, false);
            campo.value = '';
            ui.mostrarMensagem(
              retorno,
              'sucesso',
              'Cupom válido: ' + r.desconto + '% de desconto',
              'Baixa registrada para ' + r.cliente.nome + ' às ' + ui.hora(r.utilizadoEm) + '. Entregue o produto sem cobrança.'
            );
          })
          .catch(function (e) {
            ui.ocupado(botao, false);
            ui.mostrarMensagem(retorno, 'erro', 'Cupom não validado', e.message);
          });
      });
    }
  };

  /* ------------------------------------ Tabela de vendas (administrador) */
  var filtros = { periodo: 'hoje', tipo: 'todas' };
  var PERIODOS = [['hoje', 'Hoje'], ['7dias', '7 dias'], ['tudo', 'Tudo']];
  var TIPOS = [['todas', 'Todas'], ['compra', 'Compras'], ['cupom', 'Cupons']];
  var DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

  function segmentos(grupo, opcoes, atual) {
    return (
      '<div class="segmentos">' +
      opcoes
        .map(function (o) {
          return '<button type="button" data-grupo="' + grupo + '" data-valor="' + o[0] + '" aria-pressed="' + (o[0] === atual) + '">' + o[1] + '</button>';
        })
        .join('') +
      '</div>'
    );
  }

  function graficoHtml(porDia) {
    var maior = Math.max.apply(null, porDia.map(function (d) { return d.total; }).concat([1]));
    return (
      '<div class="grafico" role="img" aria-label="Marcações por dia nos últimos 7 dias: ' +
      porDia.map(function (d) { return d.dia.slice(8, 10) + '/' + d.dia.slice(5, 7) + ', ' + d.total; }).join('; ') + '">' +
      porDia
        .map(function (d, i) {
          var data = new Date(Number(d.dia.slice(0, 4)), Number(d.dia.slice(5, 7)) - 1, Number(d.dia.slice(8, 10)));
          var hoje = i === porDia.length - 1;
          return (
            '<div class="grafico-coluna' + (hoje ? ' hoje' : '') + '" aria-hidden="true">' +
            '<span class="grafico-total">' + d.total + '</span>' +
            '<span class="grafico-barra" style="height:' + Math.round((d.total / maior) * 100) + '%"></span>' +
            '<span class="grafico-dia">' + (hoje ? 'hoje' : DIAS_CURTOS[data.getDay()] + ' ' + d.dia.slice(8, 10)) + '</span></div>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function resultadoVendasHtml(dados) {
    var linhas = dados.vendas
      .map(function (v) {
        return (
          '<tr>' +
          '<td data-rotulo="Data e hora" class="numeros">' + ui.dataHora(v.dataHora) + '</td>' +
          '<td data-rotulo="Cliente" class="cliente"><span>' + ui.esc(v.cliente || '—') +
          (v.clienteContato ? '<span class="tabela-sub">' + ui.esc(v.clienteContato) + '</span>' : '') + '</span></td>' +
          '<td data-rotulo="Tipo">' + (v.tipo === 'cupom' ? 'Cupom' : 'Compra') + '</td>' +
          '<td data-rotulo="Valor" class="direita numeros">' + (v.tipo === 'cupom' ? 'Grátis' : ui.moeda(v.valor)) + '</td>' +
          '<td data-rotulo="Situação">' + etiquetaSituacao(v) + '</td>' +
          '<td data-rotulo="Vendedor">' + ui.esc(v.vendedor || '—') + '</td>' +
          '</tr>'
        );
      })
      .join('');
    var tabela = dados.vendas.length
      ? '<div class="tabela-envoltorio"><table class="tabela">' +
        '<caption>' + dados.vendas.length + (dados.vendas.length === 1 ? ' registro' : ' registros') + ', do mais recente para o mais antigo</caption>' +
        '<thead><tr><th scope="col">Data e hora</th><th scope="col">Cliente</th><th scope="col">Tipo</th>' +
        '<th scope="col" class="direita">Valor</th><th scope="col">Situação</th><th scope="col">Vendedor</th></tr></thead>' +
        '<tbody>' + linhas + '</tbody></table></div>'
      : '<div class="vazio">' + icone('table-2', 28) + '<strong>Nenhuma venda neste filtro</strong>' +
        '<span>Mude o período ou o tipo para ver outros registros.</span></div>';

    return (
      '<div class="indicadores quatro">' +
      indicador(dados.totais.vendas, 'Vendas concluídas', true) +
      indicador(dados.totais.marcacoes, 'Marcações registradas') +
      indicador(dados.totais.cupons, 'Vendas com cupom') +
      indicador(ui.moeda(dados.totais.valor), 'Valor das compras marcadas') +
      '</div>' +
      '<section class="painel" aria-labelledby="titulo-grafico"><h2 id="titulo-grafico">Marcações por dia</h2>' +
      '<p class="ajuda">Últimos 7 dias, independentemente do filtro.</p>' + graficoHtml(dados.marcacoesPorDia) + '</section>' +
      '<section class="secao" aria-labelledby="titulo-tabela"><h2 id="titulo-tabela">Vendas</h2>' + tabela + '</section>'
    );
  }

  telas.lojaVendas = {
    rota: 'loja/vendas',
    titulo: 'Tabela de vendas',
    perfis: ['administrador'],
    ampla: true,
    carrega: true,
    render: function () {
      return Fideliza.api.vendas(filtros).then(function (dados) {
        return (
          '<section class="tela">' +
          '<a class="voltar" href="#/loja">' + icone('arrow-left', 18) + 'Voltar</a>' +
          '<div class="topo-tela"><p class="sobretitulo">Administrador</p><h1>Tabela de vendas</h1></div>' +
          '<div class="filtros">' +
          '<fieldset class="filtro"><legend>Período</legend>' + segmentos('periodo', PERIODOS, filtros.periodo) + '</fieldset>' +
          '<fieldset class="filtro"><legend>Tipo</legend>' + segmentos('tipo', TIPOS, filtros.tipo) + '</fieldset>' +
          '</div>' +
          '<div id="retorno"></div>' +
          '<div class="tela" id="resultado" style="animation:none">' + resultadoVendasHtml(dados) + '</div>' +
          '</section>'
        );
      });
    },
    montar: function (raiz) {
      var resultado = raiz.querySelector('#resultado');
      var retorno = raiz.querySelector('#retorno');
      raiz.querySelectorAll('.segmentos button').forEach(function (botao) {
        botao.addEventListener('click', function () {
          var grupo = botao.getAttribute('data-grupo');
          filtros[grupo] = botao.getAttribute('data-valor');
          raiz.querySelectorAll('.segmentos button[data-grupo="' + grupo + '"]').forEach(function (b) {
            b.setAttribute('aria-pressed', String(b === botao));
          });
          resultado.setAttribute('aria-busy', 'true');
          ui.mostrarMensagem(retorno);
          Fideliza.api
            .vendas(filtros)
            .then(function (dados) {
              resultado.innerHTML = resultadoVendasHtml(dados);
              resultado.removeAttribute('aria-busy');
            })
            .catch(function (e) {
              resultado.removeAttribute('aria-busy');
              ui.mostrarMensagem(retorno, 'erro', 'Não foi possível carregar as vendas', e.message);
            });
        });
      });
    }
  };

  /* ------------------------------------------------------ Cartaz da loja */
  telas.lojaCartaz = {
    rota: 'loja/cartaz',
    titulo: 'Cartaz da loja',
    perfis: ['vendedor', 'administrador'],
    carrega: true,
    render: function (ctx) {
      return Fideliza.api.urlBase().then(function (endereco) {
        ctx.dados = { endereco: endereco, svg: ui.qrSvg(endereco, 'QR Code de acesso ao cartão fidelidade') };
        return (
          '<section class="tela">' +
          '<a class="voltar" href="#/loja">' + icone('arrow-left', 18) + 'Voltar</a>' +
          '<div class="topo-tela nao-imprimir"><h1>Cartaz da loja</h1>' +
          '<p class="apoio">Deixe este QR Code visível no balcão. O cliente aponta a câmera do celular e abre o cartão fidelidade.</p></div>' +
          '<div class="cartaz">' +
          '<p class="sobretitulo">' + ui.esc(cfg.NOME_LOJA) + '</p>' +
          '<p class="cartaz-titulo">Cartão fidelidade digital</p>' +
          '<div class="cartaz-qr">' + ctx.dados.svg + '</div>' +
          '<p>Aponte a câmera do celular para o QR Code.<br />A cada ' + cfg.LIMITE_MARCACOES + ' compras, um produto com ' + cfg.DESCONTO_CUPOM + '% de desconto.</p>' +
          '<p class="cartaz-endereco">' + ui.esc(endereco) + '</p>' +
          '</div>' +
          '<button class="botao botao-secundario botao-largo nao-imprimir" type="button" id="baixar-qr">' + icone('qr-code') + 'Baixar QR Code (SVG)</button>' +
          '</section>'
        );
      });
    },
    montar: function (raiz, ctx) {
      var botao = raiz.querySelector('#baixar-qr');
      if (!botao || !ctx.dados) return;
      botao.addEventListener('click', function () {
        ui.baixarTexto('qr-code-cartao-fidelidade.svg', ctx.dados.svg, 'image/svg+xml');
        ui.aviso('QR Code baixado em SVG.');
      });
    }
  };
})();
