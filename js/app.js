/* Núcleo do aplicativo: estado da sessão, cabeçalho, rotas (por hash) e
   controle de acesso por perfil (RNF04 e RNF07). */
(function () {
  'use strict';
  var Fideliza = (window.Fideliza = window.Fideliza || {});
  var ui = Fideliza.ui;
  var icone = Fideliza.icone;
  var cfg = Fideliza.config;

  var estado = {
    usuario: null, // { id, nome, perfil, identificador }
    destinoAposLogin: null, // rota guardada quando o cliente abre o link do QR Code sem estar logado
    novidade: null, // resultado da última marcação, mostrado na tela do cartão
    recado: null // mensagem para a próxima tela
  };

  var cabecalho = document.getElementById('cabecalho');
  var conteudo = document.getElementById('conteudo');
  var telaAtual = null;
  var vezAtual = 0;
  var primeiraTela = true;

  var NOME_PERFIL = { cliente: 'Cliente', vendedor: 'Vendedor', administrador: 'Administrador' };

  /* ----- Rotas ----- */
  var rotas = Object.keys(Fideliza.telas).map(function (nome) {
    var tela = Fideliza.telas[nome];
    return { tela: tela, partes: tela.rota ? tela.rota.split('/') : [] };
  });

  function caminhoAtual() {
    var hash = window.location.hash || '';
    if (hash.indexOf('#/') !== 0) return '';
    return hash.slice(2).replace(/\/+$/, '');
  }

  function encontrarRota(caminho) {
    var partes = caminho ? caminho.split('/') : [];
    for (var i = 0; i < rotas.length; i++) {
      var rota = rotas[i];
      if (rota.partes.length !== partes.length) continue;
      var params = {};
      var combina = true;
      for (var j = 0; j < partes.length; j++) {
        if (rota.partes[j].charAt(0) === ':') {
          params[rota.partes[j].slice(1)] = decodeURIComponent(partes[j]);
        } else if (rota.partes[j] !== partes[j]) {
          combina = false;
          break;
        }
      }
      if (combina) return { tela: rota.tela, params: params };
    }
    return null;
  }

  function inicioDoPerfil(usuario) {
    if (!usuario) return '';
    return usuario.perfil === 'cliente' ? 'cliente' : 'loja';
  }

  function navegar(caminho, substituir) {
    var destino = '#/' + (caminho || '');
    if (window.location.hash === destino || (!caminho && !window.location.hash)) {
      renderizar();
    } else if (substituir) {
      window.location.replace(destino);
    } else {
      window.location.hash = destino;
    }
  }

  /* ----- Cabeçalho ----- */
  function rotuloDoUsuario(u) {
    var nome = ui.primeiroNome(u.nome);
    var perfil = NOME_PERFIL[u.perfil];
    return nome === perfil ? perfil : nome + ' · ' + perfil;
  }
  function desenharCabecalho() {
    var u = estado.usuario;
    cabecalho.innerHTML =
      '<div class="cabecalho-interno">' +
      '<a class="marca" href="#/" aria-label="' + cfg.NOME_APP + ', página inicial"><span>' + cfg.NOME_APP + '<span class="marca-ponto">.</span></span>' +
      (Fideliza.api.modo === 'demonstracao' ? '<span class="etiqueta" title="Versão de demonstração: nada é salvo">Demo</span>' : '') +
      '</a>' +
      (u
        ? '<div class="cabecalho-usuario"><span class="cabecalho-nome">' + ui.esc(rotuloDoUsuario(u)) + '</span>' +
          '<button class="botao botao-discreto" type="button" id="sair">' + icone('log-out', 18) + 'Sair</button></div>'
        : '') +
      '</div>';
    var sair = cabecalho.querySelector('#sair');
    if (sair) {
      sair.addEventListener('click', function () {
        Fideliza.api.sair().then(encerrarSessao, encerrarSessao);
      });
    }
  }

  function encerrarSessao() {
    estado.usuario = null;
    estado.destinoAposLogin = null;
    estado.novidade = null;
    navegar('');
  }

  /* ----- Desenho da tela atual ----- */
  function renderizar() {
    var caminho = caminhoAtual();
    var rota = encontrarRota(caminho);
    var usuario = estado.usuario;

    // rota inexistente: volta para o início
    if (!rota) return navegar(inicioDoPerfil(usuario));

    var tela = rota.tela;

    // Controle de acesso por perfil
    if (tela.perfis) {
      if (!usuario) {
        if (tela.rota === 'marcar/:codigo') {
          estado.destinoAposLogin = caminho;
          estado.recado = { tipo: 'aviso', titulo: 'Entre para marcar sua compra', texto: 'Depois do login a marcação é registrada automaticamente.' };
          return navegar('login/cliente');
        }
        return navegar('');
      }
      if (tela.perfis.indexOf(usuario.perfil) < 0) {
        estado.recado = { tipo: 'erro', titulo: 'Acesso não permitido', texto: 'O perfil ' + NOME_PERFIL[usuario.perfil] + ' não tem acesso a essa tela.' };
        return navegar(inicioDoPerfil(usuario));
      }
    } else if (usuario) {
      // quem já está logado não precisa ver as telas de acesso
      return navegar(inicioDoPerfil(usuario));
    }

    if (telaAtual && telaAtual.desmontar) telaAtual.desmontar();
    telaAtual = tela;
    var vez = ++vezAtual;

    var ctx = {
      params: rota.params,
      usuario: usuario,
      novidade: tela.rota === 'cliente/cartao' ? estado.novidade : null,
      dados: null,
      navegar: navegar,
      recarregar: renderizar,
      entrar: function (novoUsuario) {
        estado.usuario = novoUsuario;
        var destino = novoUsuario.perfil === 'cliente' && estado.destinoAposLogin ? estado.destinoAposLogin : inicioDoPerfil(novoUsuario);
        estado.destinoAposLogin = null;
        navegar(destino);
      },
      definirNovidade: function (novidade) {
        estado.novidade = novidade;
      },
      recado: function (tipo, titulo, texto) {
        estado.recado = { tipo: tipo, titulo: titulo, texto: texto };
      }
    };
    if (tela.rota === 'cliente/cartao') estado.novidade = null;

    desenharCabecalho();
    conteudo.classList.toggle('conteudo-amplo', !!tela.ampla);
    document.title = tela.titulo + ' · ' + cfg.NOME_APP;
    if (tela.carrega) conteudo.innerHTML = ui.esqueleto();

    Promise.resolve()
      .then(function () {
        return tela.render(ctx);
      })
      .then(function (html) {
        if (vez !== vezAtual) return; // a pessoa já foi para outra tela
        conteudo.innerHTML = html;
        if (estado.recado) {
          var alvo = conteudo.querySelector('.topo-tela') || conteudo.querySelector('.tela');
          if (alvo) alvo.insertAdjacentHTML(alvo.classList.contains('topo-tela') ? 'afterend' : 'afterbegin', ui.mensagem(estado.recado.tipo, estado.recado.titulo, estado.recado.texto));
          estado.recado = null;
        }
        if (tela.montar) tela.montar(conteudo, ctx);
        if (!primeiraTela) {
          window.scrollTo(0, 0);
          try {
            conteudo.focus({ preventScroll: true });
          } catch (e) {
            conteudo.focus();
          }
        }
        primeiraTela = false;
      })
      .catch(function (e) {
        if (vez !== vezAtual) return;
        if (e && e.codigo === 'NAO_AUTENTICADO') {
          estado.usuario = null;
          estado.recado = { tipo: 'aviso', titulo: 'Sessão encerrada', texto: 'Faça login novamente para continuar.' };
          return navegar('');
        }
        conteudo.innerHTML =
          '<section class="tela"><div class="topo-tela"><h1>Não foi possível carregar</h1></div>' +
          ui.mensagem('erro', '', (e && e.message) || 'Tente novamente em instantes.') +
          '<button class="botao botao-primario" type="button" id="tentar">Tentar novamente</button></section>';
        conteudo.querySelector('#tentar').addEventListener('click', renderizar);
      });
  }

  /* ----- Início ----- */
  window.addEventListener('hashchange', renderizar);

  document.getElementById('pular-conteudo').addEventListener('click', function (evento) {
    evento.preventDefault(); // não altera a rota; só leva o foco ao conteúdo
    conteudo.focus();
  });

  desenharCabecalho();
  Fideliza.api
    .sessao()
    .then(function (usuario) {
      estado.usuario = usuario;
      renderizar();
    })
    .catch(function () {
      renderizar();
    });
})();
