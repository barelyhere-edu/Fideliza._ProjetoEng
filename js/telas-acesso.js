/* Telas de acesso: escolha de perfil, login e cadastro de cliente. */
(function () {
  'use strict';
  var Fideliza = (window.Fideliza = window.Fideliza || {});
  var ui = Fideliza.ui;
  var icone = Fideliza.icone;
  var cfg = Fideliza.config;
  var telas = (Fideliza.telas = Fideliza.telas || {});

  var PERFIS = {
    cliente: { titulo: 'Cliente', rotulo: 'E-mail', dica: 'Digite seu e-mail' },
    vendedor: { titulo: 'Vendedor', rotulo: 'CNPJ', dica: 'Digite o CNPJ da loja' },
    administrador: { titulo: 'Administrador', rotulo: 'CNPJ', dica: 'Digite o CNPJ da loja' }
  };

  function avisoDemonstracao(texto) {
    if (Fideliza.api.modo !== 'demonstracao') return '';
    return ui.mensagem('aviso', 'Versão de demonstração', texto);
  }

  /* ---------------------------------------------------------------- Entrada */
  telas.entrada = {
    rota: '',
    titulo: 'Entrar',
    render: function () {
      return (
        '<section class="tela tela-entrada">' +
        '<div class="topo-tela">' +
        '<p class="sobretitulo">' + ui.esc(cfg.NOME_LOJA) + ' · Cartão fidelidade</p>' +
        '<h1>Entrar como</h1>' +
        '<p class="apoio">A cada compra confirmada pela loja, uma marcação no seu cartão. Com ' + cfg.LIMITE_MARCACOES +
        ' marcações, um produto sai com ' + cfg.DESCONTO_CUPOM + '% de desconto.</p>' +
        '</div>' +
        '<div class="pilha">' +
        '<a class="botao botao-primario botao-largo" href="#/login/cliente">' + icone('user') + 'Cliente</a>' +
        '<div class="separador" aria-hidden="true">ou</div>' +
        '<a class="botao botao-secundario botao-largo" href="#/login/vendedor">' + icone('store') + 'Vendedor</a>' +
        '<a class="botao botao-secundario botao-largo" href="#/login/administrador">' + icone('shield-check') + 'Administrador</a>' +
        '</div>' +
        '<p class="ajuda">Primeira vez na loja? <a href="#/cadastro">Criar cadastro de cliente</a></p>' +
        avisoDemonstracao('Qualquer e-mail (ou CNPJ) e senha funcionam. Nenhum dado é salvo.') +
        '</section>'
      );
    }
  };

  /* ------------------------------------------------------------------ Login */
  telas.login = {
    rota: 'login/:perfil',
    titulo: 'Login',
    render: function (ctx) {
      var perfil = PERFIS[ctx.params.perfil];
      if (!perfil) {
        ctx.navegar('');
        return '';
      }
      var cliente = ctx.params.perfil === 'cliente';
      return (
        '<section class="tela">' +
        '<a class="voltar" href="#/">' + icone('arrow-left', 18) + 'Voltar</a>' +
        '<div class="topo-tela">' +
        '<p class="sobretitulo">' + perfil.titulo + '</p>' +
        '<h1>Login</h1>' +
        '</div>' +
        '<form class="formulario" id="form-login" novalidate>' +
        '<div class="campo">' +
        '<label for="identificador">' + perfil.rotulo + '</label>' +
        (cliente
          ? '<input id="identificador" name="identificador" type="email" inputmode="email" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="' + perfil.dica + '" required />'
          : '<input id="identificador" name="identificador" type="text" inputmode="numeric" autocomplete="off" placeholder="' + perfil.dica + '" maxlength="18" required />') +
        '</div>' +
        '<div class="campo">' +
        '<label for="senha">Senha</label>' +
        '<input id="senha" name="senha" type="password" autocomplete="current-password" placeholder="Digite sua senha" required />' +
        '</div>' +
        '<div id="retorno"></div>' +
        '<button class="botao botao-primario botao-largo" type="submit">Entrar</button>' +
        '</form>' +
        (cliente ? '<p class="ajuda">Ainda não tem cadastro? <a href="#/cadastro">Criar cadastro</a></p>' : '') +
        avisoDemonstracao(cliente ? 'Use qualquer e-mail e senha. O cartão de exemplo já começa com 8 marcações.' : 'Use qualquer CNPJ com 14 números e qualquer senha.') +
        '</section>'
      );
    },
    montar: function (raiz, ctx) {
      var form = raiz.querySelector('#form-login');
      if (!form) return;
      var campo = form.querySelector('#identificador');
      var retorno = form.querySelector('#retorno');
      var perfil = ctx.params.perfil;

      if (perfil !== 'cliente') {
        campo.addEventListener('input', function () {
          campo.value = ui.mascaraCnpj(campo.value);
        });
      }
      form.addEventListener('submit', function (evento) {
        evento.preventDefault();
        var botao = form.querySelector('button[type="submit"]');
        ui.mostrarMensagem(retorno);
        ui.ocupado(botao, true, 'Entrando…');
        Fideliza.api
          .login({ perfil: perfil, identificador: campo.value, senha: form.querySelector('#senha').value })
          .then(function (usuario) {
            ctx.entrar(usuario);
          })
          .catch(function (e) {
            ui.ocupado(botao, false);
            ui.mostrarMensagem(retorno, 'erro', 'Não foi possível entrar', e.message);
          });
      });
    }
  };

  /* --------------------------------------------------------------- Cadastro */
  telas.cadastro = {
    rota: 'cadastro',
    titulo: 'Cadastro',
    render: function () {
      return (
        '<section class="tela">' +
        '<a class="voltar" href="#/">' + icone('arrow-left', 18) + 'Voltar</a>' +
        '<div class="topo-tela">' +
        '<p class="sobretitulo">Cliente</p>' +
        '<h1>Criar cadastro</h1>' +
        '<p class="apoio">Leva menos de um minuto. Depois é só ler o QR Code a cada compra.</p>' +
        '</div>' +
        '<form class="formulario" id="form-cadastro" novalidate>' +
        '<div class="campo"><label for="nome">Nome</label>' +
        '<input id="nome" type="text" autocomplete="name" placeholder="Como quer ser chamado" maxlength="60" required /></div>' +
        '<div class="campo"><label for="email">E-mail</label>' +
        '<input id="email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="Digite seu e-mail" maxlength="120" required /></div>' +
        '<div class="campo"><label for="senha">Senha</label>' +
        '<input id="senha" type="password" autocomplete="new-password" placeholder="Crie uma senha" aria-describedby="dica-senha" required />' +
        '<span class="campo-dica" id="dica-senha">Mínimo de ' + cfg.TAMANHO_SENHA_MINIMO + ' caracteres.</span></div>' +
        '<label class="caixa-selecao"><input id="consentimento" type="checkbox" />' +
        '<span>Autorizo o uso do meu nome e e-mail somente para o programa de fidelidade desta loja, conforme a LGPD.</span></label>' +
        '<div id="retorno"></div>' +
        '<button class="botao botao-primario botao-largo" type="submit">' + icone('user-plus') + 'Criar cadastro</button>' +
        '</form>' +
        '<p class="ajuda">Já tem cadastro? <a href="#/login/cliente">Fazer login</a></p>' +
        '</section>'
      );
    },
    montar: function (raiz, ctx) {
      var form = raiz.querySelector('#form-cadastro');
      var retorno = form.querySelector('#retorno');
      form.addEventListener('submit', function (evento) {
        evento.preventDefault();
        var botao = form.querySelector('button[type="submit"]');
        ui.mostrarMensagem(retorno);
        ui.ocupado(botao, true, 'Criando cadastro…');
        Fideliza.api
          .cadastrar({
            nome: form.querySelector('#nome').value,
            email: form.querySelector('#email').value,
            senha: form.querySelector('#senha').value,
            consentimento: form.querySelector('#consentimento').checked
          })
          .then(function (usuario) {
            ctx.entrar(usuario);
          })
          .catch(function (e) {
            ui.ocupado(botao, false);
            ui.mostrarMensagem(retorno, 'erro', 'Cadastro não concluído', e.message);
          });
      });
    }
  };
})();
