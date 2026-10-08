import { useState } from "react";
import {
  ArrowRight, BadgeDollarSign, BarChart3, BellRing, Building2, CalendarDays, Check, ChevronDown,
  CircleDollarSign, Clock3, Compass, FileText, Focus, KeyRound, MapPinned, Menu, MessageCircle,
  ShieldCheck, Sparkles, Target, TrendingUp, UserRoundCheck, UsersRound, WalletCards, Waves, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AuthMode } from "@/features/auth/AuthPage";

type MarketingPageProps = { onAuth: (mode: AuthMode) => void };

const pains = [
  [Clock3, "O dia termina e você não sabe o que realmente avançou", "Compromissos, retornos e tarefas ficam espalhados entre conversa, papel e memória."],
  [MessageCircle, "O cliente esfria porque o follow-up ficou para depois", "Sem próxima ação clara, boas oportunidades somem no meio de dezenas de contatos."],
  [CircleDollarSign, "Você vende, mas não enxerga quanto realmente sobrou", "Comissão prevista, recebida, parcelada e despesas acabam misturadas."],
  [MapPinned, "Sua carteira existe, mas não trabalha a seu favor", "Cidade, perfil, localização, origem e temperatura do cliente não viram inteligência comercial."],
  [Target, "Muito esforço, pouca clareza sobre o que dá resultado", "Sem métricas, é difícil saber onde ajustar: atendimento, visita, proposta ou fechamento."],
  [FileText, "Materiais e informações importantes vivem perdidos", "Fotos, vídeos, edifícios, condomínios e arquivos ficam em pastas difíceis de encontrar."],
];

const solutions = [
  { id: "day", icon: CalendarDays, label: "Meu Dia", title: "Comece sabendo exatamente o que merece sua atenção", copy: "Agenda, prioridades, tarefas, clima, metas e indicadores em uma visão feita para agir, não apenas olhar.", stats: ["Agenda do dia", "Prioridades", "Progresso real"] },
  { id: "crm", icon: UsersRound, label: "Clientes", title: "Nenhum cliente importante volta a ser esquecido", copy: "Funil comercial, temperatura, origem, follow-up, WhatsApp, mapa e histórico para conduzir cada oportunidade até a próxima ação.", stats: ["Funil visual", "Mapa da carteira", "Follow-up"] },
  { id: "finance", icon: WalletCards, label: "Financeiro", title: "Veja o dinheiro que entrou, o que vem e o que venceu", copy: "Comissões, parcelas, receitas, despesas, fluxo de caixa, metas e projeções sem confundir potencial com dinheiro recebido.", stats: ["Comissões", "Fluxo de caixa", "Projeções"] },
  { id: "focus", icon: Focus, label: "Foco", title: "Transforme intenção em blocos reais de execução", copy: "Escolha uma tarefa, defina o tempo e trabalhe com os clientes e ações relacionados logo abaixo do cronômetro.", stats: ["Pomodoro", "Uma tarefa", "Ação direta"] },
];

const modules = [
  [Building2, "Edifícios e condomínios", "Catálogo organizado, localização, materiais e rota."],
  [Compass, "Conteúdo da cidade", "Fotos, vídeos, páginas e materiais para compartilhar."],
  [TrendingUp, "Mercado e argumentos", "Notícias relevantes transformadas em apoio comercial."],
  [BarChart3, "Métricas de crescimento", "Atendimentos, visitas, propostas, fechamentos e conversão."],
  [BadgeDollarSign, "Metas e comissões", "Recebido, confirmado, potencial e evolução até a meta mensal."],
  [BellRing, "Alertas e rotina", "Lembretes preparados para compromissos, tarefas e financeiro."],
  [ShieldCheck, "Operação protegida", "Dados separados por usuário e arquitetura preparada para crescer."],
];

export function MarketingPage({ onAuth }: MarketingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSolution, setActiveSolution] = useState(solutions[0].id);
  const active = solutions.find((item) => item.id === activeSolution) ?? solutions[0];

  return <main className="overflow-x-hidden bg-[#f7f8fa] text-[#0b1220]">
    <section className="relative flex min-h-[760px] flex-col overflow-hidden bg-[#05070a] text-white lg:min-h-[850px]">
      <img src="/brand/capao-sunset.png" alt="Orla do litoral ao pôr do sol" className="absolute inset-0 h-full w-full object-cover object-[68%_center]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,6,10,.95)_0%,rgba(3,6,10,.78)_42%,rgba(3,6,10,.16)_78%),linear-gradient(0deg,rgba(3,6,10,.9)_0%,transparent_48%)]" />
      <nav className="relative z-20 mx-auto flex w-full max-w-[1500px] items-center justify-between px-4 py-5 sm:px-7 lg:px-10">
        <a href="#inicio" className="flex items-center gap-3"><img src="/icons/app-icon-master.png" alt="" className="h-11 w-11 rounded-xl border border-[#d9b95f]/40 object-cover shadow-[0_10px_30px_rgba(217,185,95,.22)]" /><span><strong className="block text-sm">Agenda do Corretor</strong><small className="block text-[10px] text-white/50">Organização · Controle · Foco</small></span></a>
        <div className="hidden items-center gap-7 text-sm text-white/65 lg:flex"><a className="transition hover:text-white" href="#dores">As dores</a><a className="transition hover:text-white" href="#solucao">A solução</a><a className="transition hover:text-white" href="#recursos">Recursos</a><a className="transition hover:text-white" href="#planos">Planos</a></div>
        <div className="hidden items-center gap-2 sm:flex"><Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => onAuth("login")}>Entrar</Button><Button className="bg-[#e2c469] text-[#111318] hover:bg-[#f0d98f]" onClick={() => onAuth("signup")}>Começar agora<ArrowRight className="h-4 w-4" /></Button></div>
        <Button size="icon" variant="ghost" className="text-white sm:hidden" aria-label="Abrir menu" onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</Button>
      </nav>
      {menuOpen && <div className="relative z-20 mx-4 grid gap-1 rounded-2xl border border-white/10 bg-black/85 p-3 text-sm backdrop-blur sm:hidden"><a className="rounded-xl px-3 py-3" href="#dores" onClick={() => setMenuOpen(false)}>As dores</a><a className="rounded-xl px-3 py-3" href="#solucao" onClick={() => setMenuOpen(false)}>A solução</a><a className="rounded-xl px-3 py-3" href="#recursos" onClick={() => setMenuOpen(false)}>Recursos</a><Button className="mt-2 bg-[#e2c469] text-black" onClick={() => onAuth("signup")}>Começar agora</Button><Button variant="ghost" className="text-white" onClick={() => onAuth("login")}>Já sou assinante</Button></div>}

      <div id="inicio" className="relative z-10 mx-auto flex w-full max-w-[1500px] flex-1 items-center px-4 pb-28 pt-16 sm:px-7 lg:px-10 lg:pb-32">
        <div className="max-w-4xl animate-[landing-rise_.7s_ease-out_both]">
          <p className="inline-flex items-center gap-2 border-l-2 border-[#e2c469] pl-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#f0d98f]"><Sparkles className="h-4 w-4" />Feito para quem vive o mercado imobiliário</p>
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-8xl">Agenda do Corretor</h1>
          <p className="mt-6 max-w-2xl text-xl font-medium leading-8 text-white sm:text-2xl">Pare de perder vendas no espaço entre <span className="text-[#f0d98f]">“vou retornar”</span> e <span className="text-[#f0d98f]">“acabei esquecendo”.</span></p>
          <p className="mt-4 max-w-xl text-base leading-7 text-white/62">Na imobiliária ou de forma autônoma: organize clientes, agenda, foco, comissões, metas e materiais em um único aplicativo instalável.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button size="lg" className="h-14 bg-[#e2c469] px-6 text-base text-[#111318] shadow-[0_18px_50px_rgba(226,196,105,.22)] hover:bg-[#f0d98f]" onClick={() => onAuth("signup")}>Quero organizar minha operação<ArrowRight className="h-5 w-5" /></Button><Button size="lg" variant="outline" className="h-14 border-white/20 bg-black/20 px-6 text-white backdrop-blur hover:bg-white/10 hover:text-white" onClick={() => onAuth("login")}>Acessar minha conta</Button></div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs text-white/55"><Trust text="PWA instalável" /><Trust text="Agenda + CRM + Financeiro" /><Trust text="Mobile primeiro" /></div>
        </div>
      </div>
      <a href="#dores" aria-label="Conhecer os problemas resolvidos" className="absolute bottom-7 left-1/2 z-10 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full border border-white/20 bg-black/20 text-white/70 backdrop-blur"><ChevronDown className="h-5 w-5 animate-bounce" /></a>
    </section>

    <CoastalJourney />

    <section id="dores" className="mx-auto max-w-[1380px] px-4 py-20 sm:px-7 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr] lg:items-start"><div className="landing-scroll-reveal lg:sticky lg:top-24"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a7a2f]">A rotina cobra caro</p><h2 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">Seu problema não é falta de trabalho. É trabalho sem sistema.</h2><p className="mt-5 max-w-lg text-base leading-7 text-[#667085]">Cada detalhe esquecido vira atraso, desgaste ou oportunidade entregue para outro corretor.</p></div><div className="grid gap-px overflow-hidden rounded-2xl border border-[#e4e7ec] bg-[#e4e7ec] sm:grid-cols-2">{pains.map(([Icon, title, copy], index) => <article key={String(title)} className="landing-scroll-reveal bg-white p-6 sm:p-7"><span className="text-xs font-semibold tabular-nums text-[#b89a6a]">0{index + 1}</span><Icon className="mt-8 h-6 w-6 text-[#0b1220]" /><h3 className="mt-4 text-lg font-semibold leading-6">{String(title)}</h3><p className="mt-3 text-sm leading-6 text-[#667085]">{String(copy)}</p></article>)}</div></div>
    </section>

    <section id="solucao" className="bg-[#0b0f16] py-20 text-white lg:py-28">
      <div className="mx-auto max-w-[1380px] px-4 sm:px-7"><div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#d8b76c]">Um sistema para executar</p><h2 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">Abra. Entenda. Faça. Acompanhe.</h2><p className="mt-4 text-base leading-7 text-white/55">Sem painel genérico, sem planilha disfarçada, sem complicação para registrar uma ação simples.</p></div>
        <div className="mt-10 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]"><div className="flex gap-2 overflow-x-auto pb-2 lg:grid lg:overflow-visible">{solutions.map((item) => <button key={item.id} type="button" onClick={() => setActiveSolution(item.id)} className={cn("flex min-w-[190px] items-center gap-3 rounded-xl border px-4 py-4 text-left transition lg:min-w-0", active.id === item.id ? "border-[#d8b76c]/45 bg-[#d8b76c]/12 text-white" : "border-white/10 bg-white/[0.025] text-white/50 hover:bg-white/5")}><item.icon className="h-5 w-5 shrink-0" /><span className="text-sm font-semibold">{item.label}</span></button>)}</div>
          <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-[#111720] p-6 sm:p-9"><div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(216,183,108,.13),transparent_65%)]" /><div className="relative grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center"><div><span className="grid h-12 w-12 place-items-center rounded-xl bg-[#d8b76c]/15 text-[#efd688]"><active.icon className="h-6 w-6" /></span><h3 className="mt-6 text-3xl font-semibold leading-tight">{active.title}</h3><p className="mt-4 text-sm leading-7 text-white/55">{active.copy}</p><div className="mt-6 flex flex-wrap gap-2">{active.stats.map((stat) => <span key={stat} className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/70">{stat}</span>)}</div></div><ProductPreview type={active.id} /></div></div></div>
      </div>
    </section>

    <section id="recursos" className="mx-auto max-w-[1380px] px-4 py-20 sm:px-7 lg:py-28"><div className="landing-scroll-reveal flex flex-wrap items-end justify-between gap-6"><div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a7a2f]">Mais que uma agenda</p><h2 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">A estrutura que acompanha o corretor do primeiro contato ao pós-venda.</h2></div><Button variant="outline" size="lg" onClick={() => onAuth("signup")}>Conhecer por dentro<ArrowRight className="h-4 w-4" /></Button></div><div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{modules.map(([Icon, title, copy]) => <article key={String(title)} className="landing-scroll-reveal group rounded-2xl border border-[#e4e7ec] bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[#b89a6a]/50 hover:shadow-[0_18px_50px_rgba(16,24,40,.07)]"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f2f4f7] text-[#344054] transition group-hover:bg-[#0b1220] group-hover:text-white"><Icon className="h-5 w-5" /></span><h3 className="mt-7 text-lg font-semibold">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-[#667085]">{String(copy)}</p></article>)}</div></section>

    <section className="border-y border-[#e4e7ec] bg-white"><div className="mx-auto grid max-w-[1380px] gap-10 px-4 py-20 sm:px-7 lg:grid-cols-2 lg:items-center lg:py-24"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0f8a65]">O crescimento fica visível</p><h2 className="mt-4 text-4xl font-semibold leading-tight">Descubra onde você está vendendo e onde está deixando dinheiro na mesa.</h2><p className="mt-5 text-base leading-7 text-[#667085]">Atendimentos, visitas, clientes na praia, propostas, fechamentos, tarefas e imóveis visitados deixam de ser sensação e viram acompanhamento.</p><ul className="mt-7 grid gap-3 text-sm">{["Compare mês atual e anterior", "Acompanhe origem e conversão dos clientes", "Separe comissão recebida, confirmada e potencial", "Use dados reais, sem inventar indicadores"].map((item) => <li key={item} className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500/10 text-emerald-700"><Check className="h-3.5 w-3.5" /></span>{item}</li>)}</ul></div><GrowthChart /></div></section>

    <section id="planos" className="mx-auto max-w-[1180px] px-4 py-20 text-center sm:px-7 lg:py-28"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9a7a2f]">Escolha seu ritmo</p><h2 className="mt-4 text-4xl font-semibold">Comece organizado. Evolua sem trocar de sistema.</h2><div className="mt-10 grid gap-4 text-left md:grid-cols-2"><Plan name="Essencial" copy="Para colocar agenda, clientes e foco comercial sob controle." items={["Meu Dia e agenda", "CRM de clientes", "Módulo Foco", "Materiais e arquivos"]} onClick={() => onAuth("signup")} /><Plan featured name="Profissional" copy="Para controlar também dinheiro, metas e inteligência imobiliária." items={["Tudo do Essencial", "Financeiro completo", "Metas e relatórios", "Edifícios, condomínios e mercado"]} onClick={() => onAuth("signup")} /></div></section>

    <section className="relative overflow-hidden bg-[#05070a] text-white"><img src="/brand/capao-sunset.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" /><div className="absolute inset-0 bg-[#05070a]/70" /><div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-7 lg:py-32"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#efd688]">Sua próxima venda começa na próxima ação</p><h2 className="mt-5 text-4xl font-semibold leading-tight sm:text-6xl">Não deixe sua operação depender da memória.</h2><p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/60">Tenha clareza para atender melhor, acompanhar mais de perto e crescer com controle.</p><Button size="lg" className="mt-8 h-14 bg-[#e2c469] px-7 text-base text-[#111318] hover:bg-[#f0d98f]" onClick={() => onAuth("signup")}>Criar minha conta<ArrowRight className="h-5 w-5" /></Button></div></section>

    <footer className="bg-[#05070a] px-4 py-7 text-white/45"><div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><img src="/icons/app-icon-master.png" alt="" className="h-9 w-9 rounded-lg" /><span className="text-xs">Agenda do Corretor</span></div><div className="flex gap-5 text-xs"><button onClick={() => onAuth("login")}>Entrar</button><a href="#inicio">Voltar ao topo</a></div></div></footer>
  </main>;
}

function CoastalJourney() {
  const steps = [
    [UserRoundCheck, "Atendimento organizado", "Cliente, perfil, origem e próxima ação sempre à mão."],
    [KeyRound, "Visita que vira oportunidade", "Agenda, imóvel, retorno e negociação conectados na rotina."],
    [BadgeDollarSign, "Comissão e meta sob controle", "Acompanhe o que recebeu, o que falta e quanto avançou no mês."],
  ] as const;

  return <section className="relative overflow-hidden bg-[#eef1f4] py-20 lg:py-28">
    <div className="absolute inset-x-0 bottom-0 h-36 bg-[linear-gradient(180deg,transparent,rgba(186,213,221,.5))]" />
    <div className="mx-auto grid max-w-[1380px] gap-12 px-4 sm:px-7 lg:grid-cols-[.82fr_1.18fr] lg:items-center">
      <div className="landing-scroll-reveal relative z-10">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b6d2e]">Da conversa ao resultado</p>
        <h2 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">Do primeiro contato à comissão recebida.</h2>
        <p className="mt-5 max-w-xl text-base leading-7 text-[#667085]">A Agenda do Corretor conecta a rotina comercial e financeira para você saber quem atender, o que fazer e quanto está construindo.</p>
        <div className="mt-8 grid gap-3">{steps.map(([Icon, title, copy]) => <article key={title} className="landing-journey-step flex gap-4 rounded-2xl border border-white/80 bg-white/75 p-4 shadow-[0_12px_40px_rgba(15,23,42,.05)] backdrop-blur"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0b1220] text-[#efd688]"><Icon className="h-5 w-5" /></span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-[#667085]">{copy}</p></div></article>)}</div>
      </div>
      <div className="landing-coast-scene landing-scroll-reveal relative min-h-[440px] overflow-hidden rounded-[24px] border border-white/70 bg-[#0a111a] shadow-[0_35px_90px_rgba(15,23,42,.18)] sm:min-h-[520px]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#152536_0%,#d3a866_47%,#739ba5_68%,#173343_100%)]" />
        <div className="landing-sun absolute right-[14%] top-[12%] h-16 w-16 rounded-full bg-[#ffe5a3] shadow-[0_0_55px_rgba(255,222,137,.75)]" />
        <div className="absolute inset-x-0 bottom-[25%] h-px bg-white/35" />
        <div className="landing-building absolute bottom-[18%] left-1/2 h-[68%] w-[48%] -translate-x-1/2 overflow-hidden rounded-t-[5px] border border-white/20 bg-[#101821] shadow-[0_24px_70px_rgba(0,0,0,.5)]">
          <div className="grid h-full grid-cols-4 gap-2 p-3 pb-20 sm:gap-3 sm:p-5 sm:pb-24">{Array.from({ length: 20 }, (_, index) => <span key={index} className="landing-window rounded-[3px] border border-white/10 bg-[#f7d993]/15" />)}</div>
          <div className="absolute inset-x-[20%] bottom-0 h-24 overflow-hidden border-x border-t border-[#d8b76c]/45 bg-[#f1d39a]/15">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#f6d998_0%,rgba(246,217,152,.22)_58%,transparent_78%)]" />
            <div className="landing-door-left absolute inset-y-0 left-0 w-1/2 border-r border-[#d8b76c]/50 bg-[#111922]/95" />
            <div className="landing-door-right absolute inset-y-0 right-0 w-1/2 border-l border-[#d8b76c]/50 bg-[#111922]/95" />
          </div>
        </div>
        <div className="landing-wave landing-wave-one absolute -bottom-8 left-[-20%] h-28 w-[140%] rounded-[50%] border-t-2 border-white/50 bg-[#4b8394]/80" />
        <div className="landing-wave landing-wave-two absolute -bottom-14 left-[-15%] h-28 w-[135%] rounded-[50%] border-t border-white/35 bg-[#244f62]" />
        <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-white backdrop-blur-md"><span className="flex items-center gap-2 text-xs font-medium"><Waves className="h-4 w-4 text-[#efd688]" />Sua operação em movimento</span><span className="text-[10px] uppercase tracking-[0.12em] text-white/50">Litoral · Imóveis · Resultados</span></div>
      </div>
    </div>
  </section>;
}

function Trust({ text }: { text: string }) { return <span className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-white/10"><Check className="h-3 w-3 text-[#f0d98f]" /></span>{text}</span>; }

function ProductPreview({ type }: { type: string }) {
  const rows = type === "crm" ? [["Renata Lima", "Visita amanhã"], ["Carlos Mendes", "Retorno hoje"], ["Marina Alves", "Proposta enviada"]] : type === "finance" ? [["Recebido", "R$ 28.000"], ["Confirmado", "R$ 42.000"], ["Potencial", "R$ 95.000"]] : type === "focus" ? [["Ligar para clientes", "25:00"], ["Contatos selecionados", "6"], ["Concluídos", "3"]] : [["Visita · Ed. Via Del Mare", "10:00"], ["Retornar cliente", "14:30"], ["Enviar proposta", "17:00"]];
  return <div className="rounded-2xl border border-white/10 bg-[#080b10] p-4 shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 pb-4"><div><p className="text-[10px] uppercase tracking-[0.14em] text-white/35">Hoje</p><p className="mt-1 text-sm font-semibold">Sua operação</p></div><span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,.8)]" /></div><div className="mt-3 space-y-2">{rows.map(([label, value], index) => <div key={label} className="flex min-h-16 items-center gap-3 rounded-xl border border-white/8 bg-white/[0.035] px-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#d8b76c]/12 text-xs font-bold text-[#efd688]">0{index + 1}</span><span className="min-w-0 flex-1 truncate text-xs text-white/70">{label}</span><strong className="text-xs">{value}</strong></div>)}</div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8"><div className="h-full w-[72%] rounded-full bg-[#d8b76c]" /></div></div>;
}

function GrowthChart() { const bars = [32, 46, 40, 61, 72, 88]; return <div className="rounded-2xl border border-[#e4e7ec] bg-[#f7f8fa] p-5 sm:p-7"><div className="flex items-center justify-between"><div><p className="text-xs text-[#667085]">Evolução comercial</p><p className="mt-1 text-2xl font-semibold">Crescimento consistente</p></div><TrendingUp className="h-6 w-6 text-[#0f8a65]" /></div><div className="mt-10 flex h-52 items-end gap-3 border-b border-[#d0d5dd]">{bars.map((height, index) => <div key={index} className="flex flex-1 flex-col items-center justify-end gap-2"><div className="w-full max-w-10 rounded-t-md bg-[#0b1220] transition-all" style={{ height: `${height}%`, opacity: .55 + index * .08 }} /><span className="pb-2 text-[9px] text-[#98a2b3]">{["MAI", "JUN", "JUL", "AGO", "SET", "OUT"][index]}</span></div>)}</div></div>; }

function Plan({ name, copy, items, featured, onClick }: { name: string; copy: string; items: string[]; featured?: boolean; onClick: () => void }) { return <article className={cn("relative rounded-2xl border p-6 sm:p-8", featured ? "border-[#0b1220] bg-[#0b1220] text-white shadow-[0_24px_70px_rgba(11,18,32,.16)]" : "border-[#e4e7ec] bg-white")}>{featured && <span className="absolute right-5 top-5 rounded-full bg-[#d8b76c] px-3 py-1 text-[10px] font-bold uppercase text-[#111318]">Mais completo</span>}<h3 className="text-2xl font-semibold">{name}</h3><p className={cn("mt-3 text-sm leading-6", featured ? "text-white/55" : "text-[#667085]")}>{copy}</p><div className="mt-7 space-y-3">{items.map((item) => <p key={item} className="flex items-center gap-3 text-sm"><Check className={cn("h-4 w-4", featured ? "text-[#efd688]" : "text-[#0f8a65]")} />{item}</p>)}</div><Button size="lg" variant={featured ? "default" : "outline"} className={cn("mt-8 w-full", featured && "bg-[#e2c469] text-[#111318] hover:bg-[#f0d98f]")} onClick={onClick}>Escolher {name}</Button></article>; }
