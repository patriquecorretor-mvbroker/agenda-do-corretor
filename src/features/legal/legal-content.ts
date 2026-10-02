export type LegalDocumentType = "terms" | "privacy";

export const legalVersions = {
  terms: "2026-10-02",
  privacy: "2026-10-02"
} as const;

export const legalDocuments = {
  terms: {
    title: "Termos de Uso",
    updatedAt: "2 de outubro de 2026",
    intro: "Estes Termos regulam o uso da Agenda do Corretor, plataforma de organização e apoio à atividade imobiliária oferecida pela MV Broker.",
    sections: [
      ["1. Uso da plataforma", "A conta é pessoal e o usuário é responsável por manter suas credenciais seguras, cadastrar informações verdadeiras e utilizar o sistema de acordo com a legislação e as regras profissionais aplicáveis à corretagem de imóveis."],
      ["2. Funcionalidades", "A plataforma reúne agenda, clientes, arquivos, indicadores, conteúdos e controles financeiros de apoio. Recursos de inteligência artificial podem auxiliar no preenchimento e na análise, mas toda informação deve ser revisada pelo usuário antes de ser utilizada com clientes."],
      ["3. Dados e disponibilidade", "O usuário é responsável pelos dados que insere. A MV Broker adotará medidas razoáveis de segurança e continuidade, mas manutenções, serviços de terceiros e eventos fora de controle podem causar indisponibilidades temporárias."],
      ["4. Planos e pagamentos", "Funcionalidades disponíveis dependem do plano contratado. Valores, ciclos, teste gratuito, renovação e cancelamento devem ser apresentados antes da contratação. A falta de pagamento poderá limitar o acesso sem apagar imediatamente os dados."],
      ["5. Condutas proibidas", "Não é permitido acessar contas de terceiros, contornar limites do plano, distribuir conteúdo sem autorização, inserir material ilícito ou usar a plataforma para violar direitos de clientes, proprietários, construtoras ou outros profissionais."],
      ["6. Responsabilidade profissional", "A Agenda do Corretor não substitui avaliação jurídica, contábil, fiscal ou imobiliária. Negociações, documentos, valores e comunicações devem ser conferidos pelo corretor responsável."],
      ["7. Encerramento", "O usuário pode solicitar cancelamento, exportação ou exclusão de dados pelos controles da conta. Obrigações legais de conservação poderão impedir a eliminação imediata de determinados registros."],
      ["8. Contato", "Dúvidas sobre estes Termos podem ser enviadas para suporte@mvbroker.com.br."]
    ]
  },
  privacy: {
    title: "Política de Privacidade",
    updatedAt: "2 de outubro de 2026",
    intro: "Esta Política explica como a Agenda do Corretor trata dados pessoais de usuários e dos clientes cadastrados por eles, seguindo os princípios da Lei Geral de Proteção de Dados.",
    sections: [
      ["1. Dados tratados", "Podemos tratar identificação, contato, CRECI, empresa, cidade, preferências, agenda, tarefas, clientes, imóveis, arquivos, informações financeiras profissionais, registros de acesso e dados necessários ao funcionamento da assinatura."],
      ["2. Finalidades", "Os dados são usados para autenticar a conta, prestar as funcionalidades contratadas, sincronizar informações, personalizar a experiência, proteger a plataforma, atender suporte, cumprir obrigações legais e melhorar o produto."],
      ["3. Dados de clientes do corretor", "O corretor é responsável por possuir base legal para cadastrar e contatar seus clientes. A plataforma atua como operadora desses dados conforme as instruções do usuário, exceto quando a lei determinar outra responsabilidade."],
      ["4. Compartilhamento", "Dados podem ser processados por fornecedores essenciais de hospedagem, autenticação, armazenamento, mapas, clima, pagamentos e inteligência artificial. O compartilhamento é limitado ao necessário para cada serviço."],
      ["5. Inteligência artificial", "Conteúdos enviados a recursos de IA podem ser processados pelo fornecedor configurado para gerar o resultado solicitado. O usuário deve evitar anexar informações excessivas ou desnecessárias e sempre revisar a resposta."],
      ["6. Segurança e retenção", "São adotados controles de acesso, isolamento por usuário e medidas técnicas compatíveis com o serviço. Os dados são mantidos enquanto a conta estiver ativa ou pelo período necessário ao cumprimento de obrigações e defesa de direitos."],
      ["7. Direitos do titular", "É possível solicitar confirmação de tratamento, acesso, correção, portabilidade, informação, revogação de consentimento e exclusão quando aplicável. A conta oferece exportação e solicitação de exclusão."],
      ["8. Cookies e armazenamento local", "A aplicação utiliza armazenamento local e tecnologias necessárias para sessão, preferências, funcionamento offline e modo demonstração. Não são utilizados para vender dados pessoais."],
      ["9. Contato", "Solicitações de privacidade podem ser enviadas para privacidade@mvbroker.com.br. Antes do lançamento comercial, o responsável deverá complementar esta Política com razão social, CNPJ e endereço aplicáveis."]
    ]
  }
} satisfies Record<LegalDocumentType, { title: string; updatedAt: string; intro: string; sections: Array<[string, string]> }>;
