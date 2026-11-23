/* ==========================================================================
   Camada de dados — VERSÃO DE DEMONSTRAÇÃO (banco de dados fake)

   - Aceita qualquer e-mail/CNPJ e qualquer senha.
   - Não salva nada: todos os dados ficam em variáveis na memória e somem
     quando a página é fechada ou recarregada (não usa arquivos, cookies,
     localStorage nem servidor).
   - As regras de negócio (limite de 10 marcações, código de uso único,
     cupom de 100%, perfis de acesso) são as mesmas da versão local.

   A interface pública (Fideliza.api) é idêntica à da versão local, por isso
   as telas funcionam sem alteração nas duas versões.
   ========================================================================== */
(function () {
  'use strict';
  var Fideliza = (window.Fideliza = window.Fideliza || {});
  var cfg = Fideliza.config;

  // Alfabeto sem caracteres que se confundem (I, O, 0 e 1).
  var ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var MARCACOES_INICIAIS_DEMO = 8; // o cartão de demonstração já começa com 8 marcações
  var ATRASO_MS = 220; // simula o tempo de resposta de um servidor

  /* ----- "Tabelas" em memória ----- */
  var bd = {
    usuarios: [],
    cartoes: [],
    marcacoes: [],
    vendas: [],
    cupons: [],
    codigosUsados: {} // códigos de compra/cupom já utilizados nesta sessão
  };
  var sessao = null; // usuário que está logado nesta aba
  var contador = 0;

  /* ----- Utilidades ----- */
  function novoId(prefixo) {
    contador += 1;
    return prefixo + '-' + contador;
  }
  function agoraIso() {
    return new Date().toISOString();
  }
  function erro(mensagem, codigo) {
    var e = new Error(mensagem);
    e.codigo = codigo || 'ERRO';
    return e;
  }
  /** Executa a operação como se fosse uma chamada assíncrona a um servidor. */
  function responder(operacao) {
    return new Promise(function (resolver, rejeitar) {
      setTimeout(function () {
        try {
          resolver(operacao());
        } catch (e) {
          rejeitar(e);
        }
      }, ATRASO_MS);
    });
  }
  function mesmoDia(iso, data) {
    var d = new Date(iso);
    return d.getFullYear() === data.getFullYear() && d.getMonth() === data.getMonth() && d.getDate() === data.getDate();
  }
  function chaveDia(data) {
    var m = data.getMonth() + 1;
    var d = data.getDate();
    return data.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
  }
  function mascararEmail(email) {
    var partes = String(email).split('@');
    return partes[0].slice(0, 2) + '***@' + (partes[1] || '');
  }
  function mascararCnpj(cnpj) {
    var d = String(cnpj).replace(/\D/g, '');
    return d.slice(0, 2) + '.***.***/' + d.slice(8, 12) + '-' + d.slice(12, 14);
  }
  function nomeAPartirDoEmail(email) {
    var base = String(email).split('@')[0].replace(/[._\-0-9]+/g, ' ').trim().split(' ')[0] || 'Cliente';
    return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
  }

  /* ----- Códigos com dígito verificador -----
     Sem servidor, dois aparelhos não compartilham dados. Para a demonstração
     funcionar entre aparelhos (vendedor no computador, cliente no celular), o
     último caractere do código é um verificador calculado a partir dos demais.
     Assim o aplicativo reconhece um código emitido pelo sistema mesmo sem
     consultar um banco de dados. */
  function verificador(corpo, semente) {
    var soma = semente;
    for (var i = 0; i < corpo.length; i++) {
      soma = (soma * 31 + ALFABETO.indexOf(corpo.charAt(i)) + 7) % 9973;
    }
    return ALFABETO.charAt(soma % ALFABETO.length);
  }
  function gerarCodigo(semente) {
    var corpo = '';
    for (var i = 0; i < 5; i++) {
      corpo += ALFABETO.charAt(Math.floor(Math.random() * ALFABETO.length));
    }
    return corpo + verificador(corpo, semente);
  }
  function codigoValido(codigo, semente) {
    if (!/^[A-Z0-9]{6}$/.test(codigo)) return false;
    for (var i = 0; i < codigo.length; i++) {
      if (ALFABETO.indexOf(codigo.charAt(i)) < 0) return false;
    }
    return verificador(codigo.slice(0, 5), semente) === codigo.charAt(5);
  }
  var SEMENTE_COMPRA = 17;
  var SEMENTE_CUPOM = 53;

  /* ----- Comunicação entre abas do mesmo navegador (nada é gravado) ----- */
  var canal = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      canal = new BroadcastChannel('fideliza-demonstracao');
      canal.onmessage = function (evento) {
        var m = evento.data || {};
        if (m.tipo === 'marcacao') {
          var venda = bd.vendas.filter(function (v) {
            return v.codigo === m.codigo && v.status === 'pendente';
          })[0];
          if (venda) {
            venda.status = 'marcada';
            venda.clienteNome = m.clienteNome;
            venda.clienteContato = m.clienteContato;
            venda.progresso = m.progresso;
            venda.cupomGerado = m.cupomGerado;
            venda.marcadaEm = m.quando;
            bd.codigosUsados[m.codigo] = true;
            bd.marcacoes.push({ id: novoId('mar'), cartaoId: 'externo', vendaId: venda.id, dataHora: m.quando });
            if (m.cupomGerado) {
              bd.cupons.push({ id: novoId('cup'), codigo: m.cupomGerado, clienteId: 'externo', clienteNome: m.clienteNome, clienteContato: m.clienteContato, status: 'disponivel', geradoEm: m.quando, utilizadoEm: null });
            }
          }
        }
        if (m.tipo === 'cupom-utilizado') {
          var cupom = bd.cupons.filter(function (c) {
            return c.codigo === m.codigo;
          })[0];
          if (cupom && cupom.status === 'disponivel') {
            cupom.status = 'utilizado';
            cupom.utilizadoEm = m.quando;
          }
          bd.codigosUsados[m.codigo] = true;
        }
      };
    }
  } catch (e) {
    canal = null;
  }
  function avisarOutrasAbas(mensagem) {
    try {
      if (canal) canal.postMessage(mensagem);
    } catch (e) {
      /* a comunicação entre abas é opcional */
    }
  }

  /* ----- Dados fictícios para o painel e a tabela de vendas ----- */
  function semear() {
    var estado = 20261127;
    function aleatorio() {
      // gerador simples e determinístico: a demonstração mostra sempre os mesmos dados
      estado = (estado * 1103515245 + 12345) % 2147483648;
      return estado / 2147483648;
    }
    var clientes = [
      ['Ana Souza', 'an***@exemplo.com'],
      ['Bruno Lima', 'br***@exemplo.com'],
      ['Carla Mendes', 'ca***@exemplo.com'],
      ['Diego Rocha', 'di***@exemplo.com'],
      ['Elisa Prado', 'el***@exemplo.com'],
      ['Felipe Nunes', 'fe***@exemplo.com'],
      ['Helena Costa', 'he***@exemplo.com']
    ];
    var agora = new Date();
    for (var diasAtras = 6; diasAtras >= 0; diasAtras--) {
      var quantidade = 3 + Math.floor(aleatorio() * 5);
      for (var i = 0; i < quantidade; i++) {
        var quando = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - diasAtras, 9 + Math.floor(aleatorio() * 9), Math.floor(aleatorio() * 60));
        var cliente = clientes[Math.floor(aleatorio() * clientes.length)];
        var comCupom = aleatorio() < 0.14;
        var valor = Math.round((12 + aleatorio() * 68) * 100) / 100;
        if (quando.getTime() > agora.getTime() - 60000) continue; // nada no futuro
        var venda = {
          id: novoId('ven'),
          dataHora: quando.toISOString(),
          tipo: comCupom ? 'cupom' : 'compra',
          valor: comCupom ? 0 : valor,
          status: comCupom ? 'concluida' : 'marcada',
          codigo: null,
          expiraEm: null,
          vendedorNome: 'Vendedor',
          clienteNome: cliente[0],
          clienteContato: cliente[1]
        };
        bd.vendas.push(venda);
        if (!comCupom) {
          bd.marcacoes.push({ id: novoId('mar'), cartaoId: 'semente', vendaId: venda.id, dataHora: venda.dataHora });
        }
      }
    }
  }
  semear();

  /* ----- Regras de acesso ----- */
  function exigirPerfil(perfis) {
    if (!sessao) throw erro('Faça login para continuar.', 'NAO_AUTENTICADO');
    if (perfis.indexOf(sessao.perfil) < 0) throw erro('Seu perfil não tem acesso a esta função.', 'ACESSO_NEGADO');
    return sessao;
  }
  function usuarioPublico(u) {
    return { id: u.id, nome: u.nome, perfil: u.perfil, identificador: u.identificadorMascarado };
  }

  /* ----- Cartões ----- */
  function cartaoAtual(clienteId) {
    var cartoes = bd.cartoes.filter(function (c) {
      return c.clienteId === clienteId;
    });
    return cartoes[cartoes.length - 1];
  }
  function marcacoesDoCartao(cartaoId) {
    return bd.marcacoes.filter(function (m) {
      return m.cartaoId === cartaoId;
    });
  }
  function criarCartao(cliente, marcacoesIniciais) {
    var anteriores = bd.cartoes.filter(function (c) {
      return c.clienteId === cliente.id;
    }).length;
    var cartao = { id: novoId('car'), clienteId: cliente.id, numero: anteriores + 1, status: 'ativo', criadoEm: agoraIso(), concluidoEm: null };
    bd.cartoes.push(cartao);
    var agora = new Date();
    for (var i = 0; i < (marcacoesIniciais || 0); i++) {
      // marcações de exemplo, espalhadas pelos dias anteriores
      var quando = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - (marcacoesIniciais - i) * 2, 10 + i, 12 + i * 5);
      var venda = {
        id: novoId('ven'),
        dataHora: quando.toISOString(),
        tipo: 'compra',
        valor: 18 + i * 4.5,
        status: 'marcada',
        codigo: null,
        expiraEm: null,
        vendedorNome: 'Vendedor',
        clienteNome: cliente.nome,
        clienteContato: cliente.identificadorMascarado
      };
      bd.vendas.push(venda);
      bd.marcacoes.push({ id: novoId('mar'), cartaoId: cartao.id, vendaId: venda.id, dataHora: venda.dataHora });
    }
    return cartao;
  }
  function visaoDoCartao(cliente) {
    var cartao = cartaoAtual(cliente.id);
    return {
      cartao: {
        id: cartao.id,
        numero: cartao.numero,
        status: cartao.status,
        limite: cfg.LIMITE_MARCACOES,
        marcacoes: marcacoesDoCartao(cartao.id).map(function (m) {
          return { id: m.id, dataHora: m.dataHora };
        })
      },
      cupons: bd.cupons
        .filter(function (c) {
          return c.clienteId === cliente.id;
        })
        .map(function (c) {
          return { id: c.id, codigo: c.codigo, status: c.status, geradoEm: c.geradoEm, utilizadoEm: c.utilizadoEm };
        })
        .reverse()
    };
  }
  function vendaPublica(v) {
    return {
      id: v.id,
      dataHora: v.dataHora,
      tipo: v.tipo,
      valor: v.valor,
      status: v.status,
      cliente: v.clienteNome || null,
      clienteContato: v.clienteContato || null,
      vendedor: v.vendedorNome || null
    };
  }
  function atualizarExpiracao(venda) {
    if (venda.status === 'pendente' && venda.expiraEm && Date.now() > new Date(venda.expiraEm).getTime()) {
      venda.status = 'expirada';
    }
  }

  /* ======================================================================
     Interface pública
     ====================================================================== */
  Fideliza.api = {
    modo: 'demonstracao',

    /** Endereço do site, usado nos QR Codes. */
    urlBase: function () {
      return Promise.resolve(String(window.location.href).split('#')[0]);
    },

    sessao: function () {
      return Promise.resolve(sessao ? usuarioPublico(sessao) : null);
    },

    /** Cadastro de cliente (RF01). Na demonstração, vale só enquanto a página estiver aberta. */
    cadastrar: function (dados) {
      return responder(function () {
        var nome = String(dados.nome || '').trim();
        var email = String(dados.email || '').trim().toLowerCase();
        if (nome.length < 2) throw erro('Informe seu nome.', 'NOME_INVALIDO');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw erro('Informe um e-mail válido.', 'EMAIL_INVALIDO');
        if (String(dados.senha || '').length < cfg.TAMANHO_SENHA_MINIMO) throw erro('A senha precisa ter pelo menos ' + cfg.TAMANHO_SENHA_MINIMO + ' caracteres.', 'SENHA_FRACA');
        if (!dados.consentimento) throw erro('É preciso autorizar o uso dos dados para participar do programa.', 'SEM_CONSENTIMENTO');
        var usuario = bd.usuarios.filter(function (u) {
          return u.perfil === 'cliente' && u.chave === email;
        })[0];
        if (!usuario) {
          usuario = { id: novoId('usu'), perfil: 'cliente', chave: email, nome: nome, identificadorMascarado: mascararEmail(email) };
          bd.usuarios.push(usuario);
          criarCartao(usuario, MARCACOES_INICIAIS_DEMO);
        } else {
          usuario.nome = nome;
        }
        sessao = usuario;
        return usuarioPublico(usuario);
      });
    },

    /** Login (RF02). Na demonstração qualquer e-mail/CNPJ e senha são aceitos. */
    login: function (dados) {
      return responder(function () {
        var perfil = dados.perfil;
        var identificador = String(dados.identificador || '').trim().toLowerCase();
        if (['cliente', 'vendedor', 'administrador'].indexOf(perfil) < 0) throw erro('Perfil inválido.', 'PERFIL_INVALIDO');
        if (perfil === 'cliente') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identificador)) throw erro('Informe um e-mail válido.', 'EMAIL_INVALIDO');
        } else {
          identificador = identificador.replace(/\D/g, '');
          if (identificador.length !== 14) throw erro('Informe os 14 números do CNPJ.', 'CNPJ_INVALIDO');
        }
        if (!String(dados.senha || '')) throw erro('Informe a senha.', 'SENHA_VAZIA');

        var usuario = bd.usuarios.filter(function (u) {
          return u.perfil === perfil && u.chave === identificador;
        })[0];
        if (!usuario) {
          usuario = {
            id: novoId('usu'),
            perfil: perfil,
            chave: identificador,
            nome: perfil === 'cliente' ? nomeAPartirDoEmail(identificador) : perfil === 'vendedor' ? 'Vendedor' : 'Administrador',
            identificadorMascarado: perfil === 'cliente' ? mascararEmail(identificador) : mascararCnpj(identificador)
          };
          bd.usuarios.push(usuario);
          if (perfil === 'cliente') criarCartao(usuario, MARCACOES_INICIAIS_DEMO);
        }
        sessao = usuario;
        return usuarioPublico(usuario);
      });
    },

    sair: function () {
      sessao = null;
      return Promise.resolve();
    },

    /* ----- Cliente ----- */

    /** Cartão atual e cupons do cliente (RF04, RF09). */
    cartao: function () {
      return responder(function () {
        return visaoDoCartao(exigirPerfil(['cliente']));
      });
    },

    /** Registra uma marcação a partir do código lido no QR Code (RF05, RF07, RF08, RF10, RF14). */
    marcar: function (codigoInformado) {
      return responder(function () {
        var cliente = exigirPerfil(['cliente']);
        var codigo = String(codigoInformado || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!codigoValido(codigo, SEMENTE_COMPRA)) {
          throw erro('Código inválido. Confira os 6 caracteres mostrados na tela do vendedor.', 'CODIGO_INVALIDO');
        }
        var venda = bd.vendas.filter(function (v) {
          return v.codigo === codigo;
        })[0];
        if (venda) atualizarExpiracao(venda);
        // RN04: cada código vale para uma única marcação
        if (bd.codigosUsados[codigo] || (venda && venda.status === 'marcada')) {
          throw erro('Este código já foi utilizado. Cada compra gera uma única marcação.', 'CODIGO_UTILIZADO');
        }
        if (venda && venda.status === 'expirada') {
          throw erro('Este código expirou. Peça ao vendedor para gerar um novo.', 'CODIGO_EXPIRADO');
        }
        var cartao = cartaoAtual(cliente.id);
        // RN02 / RF14: no máximo 10 marcações por cartão
        if (cartao.status === 'completo' || marcacoesDoCartao(cartao.id).length >= cfg.LIMITE_MARCACOES) {
          throw erro('Seu cartão já está completo. Inicie um novo cartão para continuar marcando.', 'CARTAO_COMPLETO');
        }
        var quando = agoraIso();
        if (!venda) {
          // código emitido em outro aparelho: registra a compra confirmada aqui
          venda = { id: novoId('ven'), dataHora: quando, tipo: 'compra', valor: null, status: 'pendente', codigo: codigo, expiraEm: null, vendedorNome: 'Vendedor' };
          bd.vendas.push(venda);
        }
        venda.status = 'marcada';
        venda.clienteNome = cliente.nome;
        venda.clienteContato = cliente.identificadorMascarado;
        venda.marcadaEm = quando;
        bd.codigosUsados[codigo] = true;
        var marcacao = { id: novoId('mar'), cartaoId: cartao.id, vendaId: venda.id, dataHora: quando };
        bd.marcacoes.push(marcacao);

        var total = marcacoesDoCartao(cartao.id).length;
        var cupom = null;
        if (total >= cfg.LIMITE_MARCACOES) {
          // RN05: cartão completo gera um cupom de 100% de desconto
          cartao.status = 'completo';
          cartao.concluidoEm = quando;
          cupom = { id: novoId('cup'), codigo: 'CUP-' + gerarCodigo(SEMENTE_CUPOM), clienteId: cliente.id, clienteNome: cliente.nome, clienteContato: cliente.identificadorMascarado, cartaoId: cartao.id, status: 'disponivel', geradoEm: quando, utilizadoEm: null };
          bd.cupons.push(cupom);
        }
        venda.progresso = total;
        venda.cupomGerado = cupom ? cupom.codigo : null;
        avisarOutrasAbas({ tipo: 'marcacao', codigo: codigo, clienteNome: cliente.nome, clienteContato: cliente.identificadorMascarado, progresso: total, cupomGerado: cupom ? cupom.codigo : null, quando: quando });

        var visao = visaoDoCartao(cliente);
        visao.cupomGerado = cupom ? { id: cupom.id, codigo: cupom.codigo, status: cupom.status, geradoEm: cupom.geradoEm } : null;
        return visao;
      });
    },

    /** Inicia um novo ciclo depois que o cartão foi completado (RN06). */
    novoCartao: function () {
      return responder(function () {
        var cliente = exigirPerfil(['cliente']);
        var cartao = cartaoAtual(cliente.id);
        if (cartao.status !== 'completo') throw erro('O cartão atual ainda não foi completado.', 'CARTAO_INCOMPLETO');
        criarCartao(cliente, 0);
        return visaoDoCartao(cliente);
      });
    },

    /* ----- Vendedor e administrador ----- */

    /** Confirma uma compra e gera o código de uso único mostrado no QR Code (RF06). */
    confirmarCompra: function (valor) {
      return responder(function () {
        var vendedor = exigirPerfil(['vendedor', 'administrador']);
        if (valor !== null && valor !== undefined && (!isFinite(valor) || valor <= 0 || valor > 99999)) {
          throw erro('Informe um valor válido para a compra ou deixe o campo em branco.', 'VALOR_INVALIDO');
        }
        var agora = Date.now();
        var venda = {
          id: novoId('ven'),
          dataHora: new Date(agora).toISOString(),
          tipo: 'compra',
          valor: valor === undefined ? null : valor,
          status: 'pendente',
          codigo: gerarCodigo(SEMENTE_COMPRA),
          expiraEm: new Date(agora + cfg.VALIDADE_QR_MINUTOS * 60000).toISOString(),
          vendedorNome: vendedor.nome
        };
        bd.vendas.push(venda);
        return { id: venda.id, codigo: venda.codigo, expiraEm: venda.expiraEm, valor: venda.valor };
      });
    },

    /** Situação de uma compra confirmada: pendente, marcada ou expirada. */
    statusCompra: function (id) {
      return responder(function () {
        exigirPerfil(['vendedor', 'administrador']);
        var venda = bd.vendas.filter(function (v) {
          return v.id === id;
        })[0];
        if (!venda) throw erro('Compra não encontrada.', 'NAO_ENCONTRADA');
        atualizarExpiracao(venda);
        return {
          id: venda.id,
          status: venda.status,
          codigo: venda.codigo,
          expiraEm: venda.expiraEm,
          valor: venda.valor,
          cliente: venda.status === 'marcada' ? { nome: venda.clienteNome, marcacoes: venda.progresso, limite: cfg.LIMITE_MARCACOES } : null,
          cupomGerado: !!venda.cupomGerado
        };
      });
    },

    /** Valida o cupom de 100% e registra a venda com cupom. */
    resgatarCupom: function (codigoInformado) {
      return responder(function () {
        var vendedor = exigirPerfil(['vendedor', 'administrador']);
        var limpo = String(codigoInformado || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (limpo.indexOf('CUP') === 0) limpo = limpo.slice(3);
        if (!codigoValido(limpo, SEMENTE_CUPOM)) throw erro('Cupom não encontrado. Confira o código mostrado no aplicativo do cliente.', 'CUPOM_INVALIDO');
        var codigo = 'CUP-' + limpo;
        var cupom = bd.cupons.filter(function (c) {
          return c.codigo === codigo;
        })[0];
        if ((cupom && cupom.status === 'utilizado') || (!cupom && bd.codigosUsados[codigo])) {
          throw erro('Este cupom já foi utilizado' + (cupom && cupom.utilizadoEm ? ' em ' + Fideliza.ui.dataHora(cupom.utilizadoEm) : '') + '.', 'CUPOM_UTILIZADO');
        }
        var quando = agoraIso();
        if (cupom) {
          cupom.status = 'utilizado';
          cupom.utilizadoEm = quando;
        }
        bd.codigosUsados[codigo] = true;
        var venda = {
          id: novoId('ven'),
          dataHora: quando,
          tipo: 'cupom',
          valor: 0,
          status: 'concluida',
          codigo: null,
          expiraEm: null,
          vendedorNome: vendedor.nome,
          clienteNome: cupom ? cupom.clienteNome : 'Cliente',
          clienteContato: cupom ? cupom.clienteContato : null
        };
        bd.vendas.push(venda);
        avisarOutrasAbas({ tipo: 'cupom-utilizado', codigo: codigo, quando: quando });
        return { codigo: codigo, cliente: { nome: venda.clienteNome }, utilizadoEm: quando, desconto: cfg.DESCONTO_CUPOM };
      });
    },

    /** Indicadores do dia para o painel da loja (RF12). */
    resumo: function () {
      return responder(function () {
        exigirPerfil(['vendedor', 'administrador']);
        var hoje = new Date();
        bd.vendas.forEach(atualizarExpiracao);
        var vendasHoje = bd.vendas.filter(function (v) {
          return mesmoDia(v.dataHora, hoje);
        });
        return {
          marcacoesHoje: bd.marcacoes.filter(function (m) {
            return mesmoDia(m.dataHora, hoje);
          }).length,
          cuponsGeradosHoje: bd.cupons.filter(function (c) {
            return mesmoDia(c.geradoEm, hoje);
          }).length,
          vendasComCupomHoje: vendasHoje.filter(function (v) {
            return v.tipo === 'cupom';
          }).length,
          ultimas: vendasHoje
            .slice()
            .sort(function (a, b) {
              return a.dataHora < b.dataHora ? 1 : -1;
            })
            .slice(0, 6)
            .map(vendaPublica)
        };
      });
    },

    /** Tabela de vendas, histórico e marcações por dia — somente administrador (RF11, RF12, RF13). */
    vendas: function (filtros) {
      return responder(function () {
        exigirPerfil(['administrador']);
        var periodo = (filtros && filtros.periodo) || 'hoje';
        var tipo = (filtros && filtros.tipo) || 'todas';
        var agora = new Date();
        var inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
        var inicio = periodo === 'hoje' ? inicioHoje : periodo === '7dias' ? inicioHoje - 6 * 86400000 : 0;
        bd.vendas.forEach(atualizarExpiracao);
        var lista = bd.vendas
          .filter(function (v) {
            return new Date(v.dataHora).getTime() >= inicio && (tipo === 'todas' || v.tipo === tipo);
          })
          .sort(function (a, b) {
            return a.dataHora < b.dataHora ? 1 : -1;
          });
        var porDia = [];
        for (var i = 6; i >= 0; i--) {
          var dia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - i);
          porDia.push({
            dia: chaveDia(dia),
            total: bd.marcacoes.filter(function (m) {
              return mesmoDia(m.dataHora, dia);
            }).length
          });
        }
        return {
          vendas: lista.map(vendaPublica),
          marcacoesPorDia: porDia,
          totais: {
            vendas: lista.filter(function (v) {
              return v.status === 'marcada' || v.status === 'concluida';
            }).length,
            marcacoes: lista.filter(function (v) {
              return v.status === 'marcada';
            }).length,
            cupons: lista.filter(function (v) {
              return v.tipo === 'cupom';
            }).length,
            valor: lista.reduce(function (soma, v) {
              return soma + (v.status === 'marcada' && v.valor ? Number(v.valor) : 0);
            }, 0)
          }
        };
      });
    }
  };
})();
