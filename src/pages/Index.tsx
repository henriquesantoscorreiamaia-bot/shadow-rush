import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Award, Bell, ChevronRight, CircleHelp, Coins, Crown, Gamepad2, Ghost,
  Heart, Lock, Medal, Pause, Play, RotateCcw, Settings, Shield, Sparkles, Swords,
  Trophy, Volume2, VolumeX, Zap,
} from "lucide-react";
import { CanvasActionButton, GameResult, ShadowCanvas } from "@/components/ShadowCanvas";
import { adDisclosure } from "@/lib/ads";
import { clearGame, GameSave, loadGame, saveGame } from "@/lib/gameStorage";
import "../App.css";

type Screen = "home" | "modes" | "flight" | "fighter" | "characters" | "shop" | "missions" | "records" | "premium" | "settings" | "credits";

type MenuButtonProps = { icon: React.ReactNode; label: string; onClick: () => void; badge?: string };

const menuButtons: { label: string; icon: React.ReactNode; screen: Screen }[] = [
  { label: "Personagens", icon: <Ghost size={17} />, screen: "characters" },
  { label: "Loja", icon: <Coins size={17} />, screen: "shop" },
  { label: "Missões", icon: <Trophy size={17} />, screen: "missions" },
  { label: "Recordes", icon: <Medal size={17} />, screen: "records" },
];

const formatNumber = (value: number) => value.toLocaleString("pt-BR");

function MenuButton({ icon, label, onClick, badge }: MenuButtonProps) {
  return <button type="button" className="menu-row" onClick={onClick}><span className="menu-row-icon">{icon}</span><span>{label}</span>{badge && <span className="menu-badge">{badge}</span>}<ChevronRight className="menu-arrow" size={18} /></button>;
}

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return <div className="stat-pill"><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>;
}

function ScreenHeader({ title, eyebrow, onBack }: { title: string; eyebrow?: string; onBack: () => void }) {
  return <header className="screen-header"><button type="button" className="icon-button" onClick={onBack} aria-label="Voltar"><ArrowLeft size={19} /></button><div><span className="eyebrow">{eyebrow ?? "SHADOW RUSH"}</span><h1>{title}</h1></div><div className="header-mark">SR</div></header>;
}

function AdNotice() {
  return <div className="ad-notice"><span className="ad-label">AD</span><div><strong>Anúncios em demonstração</strong><p>{adDisclosure} O jogo não depende deles.</p></div></div>;
}

function Index() {
  const [save, setSave] = useState<GameSave>(() => loadGame());
  const [screen, setScreen] = useState<Screen>("home");
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => saveGame(save), [save]);
  useEffect(() => {
    const pauseOnBlur = () => { if (screen === "flight" || screen === "fighter") setNotice("Partida pausada com segurança"); };
    window.addEventListener("blur", pauseOnBlur);
    return () => window.removeEventListener("blur", pauseOnBlur);
  }, [screen]);

  const updateSave = (mutate: (current: GameSave) => GameSave) => setSave((current) => mutate(current));
  const go = (next: Screen) => { setNotice(""); if (next === "flight" || next === "fighter") setLastResult(null); setScreen(next); };

  const handleResult = (result: GameResult) => {
    setLastResult(result);
    updateSave((current) => {
      const xpGain = result.win ? 80 : Math.max(10, Math.floor(result.distance / 6));
      const nextXp = current.xp + xpGain;
      const nextLevel = current.level + (nextXp >= current.level * 120 ? 1 : 0);
      const nextMissions = {
        ...current.missions,
        distance: Math.min(1200, current.missions.distance + result.distance),
        defeat: Math.min(12, current.missions.defeat + result.enemies),
        collect: Math.min(60, current.missions.collect + result.coins),
        fighter: Math.min(3, current.missions.fighter + (result.mode === "fighter" && result.win ? 1 : 0)),
      };
      return {
        ...current,
        fragments: current.fragments + result.coins + (result.win ? 35 : 8),
        crystals: current.crystals + result.crystals,
        xp: nextXp >= current.level * 120 ? nextXp - current.level * 120 : nextXp,
        level: nextLevel,
        bestFlight: Math.max(current.bestFlight, result.mode === "flight" ? result.score : current.bestFlight),
        bestCombo: Math.max(current.bestCombo, result.enemies),
        totalRuns: current.totalRuns + 1,
        totalDefeated: current.totalDefeated + result.enemies,
        victories: current.victories + (result.win ? 1 : 0),
        missions: nextMissions,
        achievements: current.achievements.includes("first-run") ? current.achievements : [...current.achievements, "first-run"],
      };
    });
  };

  const buyItem = (id: string, cost: number, currency: "fragments" | "crystals") => {
    if (save[currency] < cost) { setNotice(`Faltam ${cost - save[currency]} ${currency === "fragments" ? "fragmentos" : "cristais"}.`); return; }
    updateSave((current) => ({ ...current, [currency]: current[currency] - cost, unlockedSkins: [...current.unlockedSkins, id] }));
    setNotice("Desbloqueado! Item cosmético salvo no aparelho.");
  };

  const renderScreen = () => {
    if (screen === "flight" || screen === "fighter") return <GameScreen mode={screen} result={lastResult} onBack={() => go("home")} onResult={handleResult} />;
    if (screen === "home") return <Home save={save} onNavigate={go} />;
    if (screen === "modes") return <Modes onNavigate={go} onBack={() => go("home")} />;
    if (screen === "characters") return <Characters save={save} onBack={() => go("home")} onNavigate={go} />;
    if (screen === "shop") return <Shop save={save} onBack={() => go("home")} onBuy={buyItem} onNavigate={go} />;
    if (screen === "missions") return <Missions save={save} onBack={() => go("home")} />;
    if (screen === "records") return <Records save={save} onBack={() => go("home")} />;
    if (screen === "premium") return <Premium save={save} onBack={() => go("home")} onNotice={setNotice} />;
    if (screen === "settings") return <SettingsScreen save={save} updateSave={updateSave} onBack={() => go("home")} onReset={() => { if (window.confirm("Apagar todo o progresso local deste aparelho?")) { clearGame(); setSave(loadGame()); setNotice("Progresso restaurado para o estado inicial."); } }} />;
    return <Credits onBack={() => go("home")} />;
  };

  return <main className="app-shell"><div className="phone-frame">{renderScreen()}{notice && <div className="toast-message" role="status"><Sparkles size={15} />{notice}</div>}</div></main>;
}

function Home({ save, onNavigate }: { save: GameSave; onNavigate: (screen: Screen) => void }) {
  return <section className="home-screen">
    <div className="home-top"><div className="brand-lockup"><div className="brand-emblem"><span>SR</span></div><div><span className="eyebrow">UM ARCADE DE SOMBRAS</span><h1>SHADOW <em>RUSH</em></h1></div></div><button type="button" className="icon-button muted" onClick={() => onNavigate("settings")} aria-label="Configurações"><Settings size={20} /></button></div>
    <div className="hero-card"><div className="hero-copy"><span className="tag"><span className="pulse-dot" /> TEMPORADA I · VÉU CARMESIM</span><h2>Corra além<br /><em>do medo.</em></h2><p>Desvie, enfrente as sombras e escreva seu próprio recorde.</p><button type="button" className="primary-button hero-cta" onClick={() => onNavigate("flight")}><Play size={17} fill="currentColor" /> Jogar Shadow Flight</button></div><div className="hero-figure"><div className="moon" /><div className="figure-body"><div className="figure-eyes" /><div className="figure-cape" /></div><div className="hero-spark spark-one" /><div className="hero-spark spark-two" /><span className="hero-rune">✦</span></div></div>
    <div className="resource-bar"><StatPill icon={<span className="resource-gem fragment" />} value={formatNumber(save.fragments)} label="fragmentos" /><div className="resource-divider" /><StatPill icon={<span className="resource-gem crystal" />} value={formatNumber(save.crystals)} label="cristais" /><div className="resource-divider" /><StatPill icon={<Shield size={15} />} value={`Nv. ${save.level}`} label={`${save.xp}/360 XP`} /></div>
    <div className="section-heading"><div><span className="eyebrow">ESCOLHA SEU RITMO</span><h2>Modos de jogo</h2></div><button type="button" className="text-button" onClick={() => onNavigate("modes")}>Ver todos <ChevronRight size={15} /></button></div>
    <div className="mode-grid"><button type="button" className="mode-card flight-card" onClick={() => onNavigate("flight")}><div className="mode-card-top"><span className="mode-number">01</span><span className="mode-live">∞ INFINITO</span></div><div><Swords size={25} /><h3>Shadow Flight</h3><p>Reflexos contra o vazio.</p></div><span className="card-arrow"><ChevronRight size={17} /></span></button><button type="button" className="mode-card fighter-card" onClick={() => onNavigate("fighter")}><div className="mode-card-top"><span className="mode-number">02</span><span className="mode-live">ARENA</span></div><div><Zap size={25} /><h3>Shadow Fighter</h3><p>Golpeie. Desvie. Vença.</p></div><span className="card-arrow"><ChevronRight size={17} /></span></button></div>
    <div className="section-heading compact"><div><span className="eyebrow">SEMPRE HÁ UM PRÓXIMO PASSO</span><h2>Seu caminho</h2></div></div>
    <div className="menu-list">{menuButtons.map((item) => <MenuButton key={item.label} icon={item.icon} label={item.label} onClick={() => onNavigate(item.screen)} badge={item.label === "Missões" ? "2 novas" : undefined} />)}<MenuButton icon={<Crown size={17} />} label="Premium" onClick={() => onNavigate("premium")} badge="DEMO" /><MenuButton icon={<CircleHelp size={17} />} label="Créditos e privacidade" onClick={() => onNavigate("credits")} /></div>
    <p className="offline-note"><span className="offline-dot" /> Progresso salvo apenas neste aparelho · Jogável offline</p>
  </section>;
}

function Modes({ onNavigate, onBack }: { onNavigate: (screen: Screen) => void; onBack: () => void }) {
  return <section className="inner-screen"><ScreenHeader title="Modos de jogo" eyebrow="ESCOLHA SUA BATALHA" onBack={onBack} /><div className="mode-detail-list"><button type="button" className="mode-detail flight-card" onClick={() => onNavigate("flight")}><span className="mode-number">01</span><div><span className="eyebrow">ARCADE INFINITO</span><h2>Shadow Flight</h2><p>Corra automaticamente, salte obstáculos, colete fragmentos e ataque inimigos. A velocidade cresce com sua confiança.</p><span className="detail-link">Começar corrida <ChevronRight size={15} /></span></div></button><button type="button" className="mode-detail fighter-card" onClick={() => onNavigate("fighter")}><span className="mode-number">02</span><div><span className="eyebrow">COMBATE 2D</span><h2>Shadow Fighter</h2><p>Enfrente a Sentinela do Vazio com ataques rápidos, golpes fortes, esquiva e a Explosão de Energia.</p><span className="detail-link">Entrar na arena <ChevronRight size={15} /></span></div></button></div><div className="tutorial-card"><Sparkles size={19} /><div><strong>Aprenda em segundos</strong><p>Toque em qualquer lugar para saltar no Flight. Use os botões grandes para lutar no Fighter. Perder nunca apaga seu progresso.</p></div></div></section>;
}

function GameScreen({ mode, onBack, onResult, result }: { mode: "flight" | "fighter"; onBack: () => void; onResult: (result: GameResult) => void; result: GameResult | null }) {
  const [paused, setPaused] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const resultForMode = result?.mode === mode ? result : null;
  useEffect(() => {
    const pauseSafely = () => setPaused(true);
    const onVisibility = () => { if (document.hidden) pauseSafely(); };
    window.addEventListener("blur", pauseSafely);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.removeEventListener("blur", pauseSafely); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);
  return <section className="game-screen"><div className="game-topbar"><button type="button" className="icon-button game-back" onClick={onBack}><ArrowLeft size={19} /></button><div><span className="eyebrow">{mode === "flight" ? "SHADOW FLIGHT" : "SHADOW FIGHTER"}</span><strong>{mode === "flight" ? "Véu Carmesim" : "Arena do Vazio"}</strong></div><button type="button" className="icon-button game-pause" onClick={() => setPaused((value) => !value)} aria-label="Pausar"><Pause size={18} /></button></div><div className="game-stage"><ShadowCanvas mode={mode} paused={paused} onResult={(item) => { if (Date.now() - startedAt > 350) onResult(item); }} onBack={onBack} />{paused && <div className="pause-overlay"><div className="pause-card"><Pause size={25} /><span className="eyebrow">PARTIDA PAUSADA</span><h2>Respire.</h2><p>O mundo espera por você.</p><button type="button" className="primary-button" onClick={() => setPaused(false)}><Play size={16} fill="currentColor" /> Continuar</button><button type="button" className="ghost-button" onClick={onBack}>Sair da partida</button></div></div>}{resultForMode && <div className="result-overlay"><div className="result-card"><div className={`result-icon ${resultForMode.win ? "win" : "loss"}`}>{resultForMode.win ? <Trophy size={29} /> : <RotateCcw size={29} />}</div><span className="eyebrow">{resultForMode.win ? "VITÓRIA" : "A SOMBRA VENCEU"}</span><h2>{resultForMode.win ? "Golpe perfeito." : "Quase lá."}</h2><p>{resultForMode.win ? "A arena silenciou diante de você." : "Cada tentativa revela um novo caminho."}</p><div className="result-rewards"><span><span className="resource-gem fragment" /> +{resultForMode.coins + (resultForMode.win ? 35 : 8)}</span><span><span className="resource-gem crystal" /> +{resultForMode.crystals}</span></div><AdNotice /><button type="button" className="primary-button" onClick={() => window.location.reload()}><RotateCcw size={16} /> Jogar novamente</button><button type="button" className="ghost-button" onClick={onBack}>Voltar ao menu</button></div></div>}</div><div className="game-controls">{mode === "flight" ? <><CanvasActionButton label="Saltar" icon="↑" tone="violet" onClick={() => document.querySelector<HTMLCanvasElement>(".game-canvas")?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }))} /><CanvasActionButton label="Cortar" icon="✦" tone="gold" onClick={() => document.querySelector<HTMLCanvasElement>(".game-canvas")?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 2 }))} /></> : <><CanvasActionButton label="Rápido" icon="✦" tone="red" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }))} /><CanvasActionButton label="Forte" icon="◆" tone="gold" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "s" }))} /><CanvasActionButton label="Esquiva" icon="↝" tone="violet" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "d" }))} /><CanvasActionButton label="Explosão" icon="✹" tone="blue" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "q" }))} /></>}</div></section>;
}

function Characters({ save, onBack, onNavigate }: { save: GameSave; onBack: () => void; onNavigate: (screen: Screen) => void }) {
  return <section className="inner-screen"><ScreenHeader title="Personagens" eyebrow="COLEÇÃO DE SOMBRAS" onBack={onBack} /><div className="character-hero"><div className="character-art"><div className="figure-body large"><div className="figure-eyes" /></div></div><div><span className="eyebrow">ATIVO · NÍVEL {save.level}</span><h2>O Errante</h2><p>Uma presença sem passado, movida por uma promessa em vermelho.</p><div className="tag-row"><span>Equilibrado</span><span>Começo</span></div></div></div><div className="section-heading compact"><div><span className="eyebrow">PRÓXIMOS DESBLOQUEIOS</span><h2>Formas do vazio</h2></div><button type="button" className="text-button" onClick={() => onNavigate("shop")}>Ir à loja <ChevronRight size={15} /></button></div><div className="locked-grid"><div className="locked-card"><div className="mini-silhouette crimson" /><strong>Vigia Rubra</strong><small>400 fragmentos</small><Lock size={15} /></div><div className="locked-card"><div className="mini-silhouette violet" /><strong>Eco Lunar</strong><small>8 cristais</small><Lock size={15} /></div></div></section>;
}

function Shop({ save, onBack, onBuy, onNavigate }: { save: GameSave; onBack: () => void; onBuy: (id: string, cost: number, currency: "fragments" | "crystals") => void; onNavigate: (screen: Screen) => void }) {
  return <section className="inner-screen"><ScreenHeader title="Mercado de ecos" eyebrow="LOJA · SEM CAIXAS ALEATÓRIAS" onBack={onBack} /><div className="shop-balance"><span><span className="resource-gem fragment" /> {formatNumber(save.fragments)}</span><span><span className="resource-gem crystal" /> {formatNumber(save.crystals)}</span></div><div className="shop-tabs"><span className="active">Cosméticos</span><span>Habilidades</span><span>Temas</span></div><div className="shop-grid"><ShopItem title="Manto Carmesim" description="Rastro de energia vermelho-sangue." price="240" currency="fragment" visual="crimson" owned={save.unlockedSkins.includes("crimson") || save.unlockedSkins.includes("mantle")} onBuy={() => onBuy("mantle", 240, "fragments")} /><ShopItem title="Névoa Violeta" description="Brilho alternativo para o Errante." price="5" currency="crystal" visual="violet" owned={save.unlockedSkins.includes("violet")} onBuy={() => onBuy("violet", 5, "crystals")} /><ShopItem title="Corte Lunar" description="Efeito cosmético de habilidade." price="320" currency="fragment" visual="blue" owned={save.unlockedSkins.includes("lunar-cut")} onBuy={() => onBuy("lunar-cut", 320, "fragments")} /><ShopItem title="Rastro Âmbar" description="Rastro especial para seus recordes." price="3" currency="crystal" visual="gold" owned={save.unlockedSkins.includes("amber-trail")} onBuy={() => onBuy("amber-trail", 3, "crystals")} /></div><AdNotice /><button type="button" className="premium-strip" onClick={() => onNavigate("premium")}><Crown size={18} /><div><strong>Quer mais estilo?</strong><small>Conheça o Premium demonstrativo, sem cobrança nesta versão.</small></div><ChevronRight size={17} /></button></section>;
}

function ShopItem({ title, description, price, currency, visual, owned, onBuy }: { title: string; description: string; price: string; currency: string; visual: string; owned: boolean; onBuy: () => void }) {
  return <article className="shop-item"><div className={`shop-visual ${visual}`}><div className="mini-silhouette" /></div><div className="shop-item-copy"><strong>{title}</strong><p>{description}</p>{owned ? <span className="owned-label">✓ Desbloqueado</span> : <button type="button" className="buy-button" onClick={onBuy}><span className={`resource-gem ${currency}`} /> {price}</button>}</div></article>;
}

function Missions({ save, onBack }: { save: GameSave; onBack: () => void }) {
  const missions = [{ key: "distance", title: "Passos no escuro", text: "Corra 1.200m no Shadow Flight.", goal: 1200, reward: "+80 fragmentos", icon: <Ghost size={18} /> }, { key: "defeat", title: "Sem deixar rastros", text: "Derrote 12 inimigos.", goal: 12, reward: "+2 cristais", icon: <Swords size={18} /> }, { key: "collect", title: "Luz roubada", text: "Colete 60 fragmentos em partidas.", goal: 60, reward: "+60 fragmentos", icon: <Sparkles size={18} /> }, { key: "fighter", title: "Primeiro sangue", text: "Vença 3 arenas locais.", goal: 3, reward: "+4 cristais", icon: <Trophy size={18} /> }];
  return <section className="inner-screen"><ScreenHeader title="Missões" eyebrow="OBJETIVOS · SEM PRESSA" onBack={onBack} /><div className="mission-banner"><div><span className="eyebrow">CICLO LOCAL · SEM LOGIN</span><h2>Pequenos passos,<br /><em>grandes ecos.</em></h2></div><Award size={40} /></div><div className="mission-list">{missions.map((mission) => { const progress = Math.min(mission.goal, save.missions[mission.key] ?? 0); const done = progress >= mission.goal; return <div className={`mission-item ${done ? "done" : ""}`} key={mission.key}><div className="mission-icon">{mission.icon}</div><div className="mission-copy"><strong>{mission.title}</strong><p>{mission.text}</p><div className="progress-track"><span style={{ width: `${(progress / mission.goal) * 100}%` }} /></div><small>{progress}/{mission.goal} · {mission.reward}</small></div><span className="mission-state">{done ? "✓" : ""}</span></div>; })}</div><p className="small-note">As missões são geradas e salvas localmente. Elas não expiram e nunca exigem sequência diária.</p></section>;
}

function Records({ save, onBack }: { save: GameSave; onBack: () => void }) {
  return <section className="inner-screen"><ScreenHeader title="Livro de recordes" eyebrow="SUAS MARCAS" onBack={onBack} /><div className="record-highlight"><span className="eyebrow">MELHOR SHADOW FLIGHT</span><strong>{formatNumber(save.bestFlight)}</strong><small>pontos · feito neste aparelho</small><div className="record-stars">✦ ✦ ✦</div></div><div className="record-grid"><div><span>PARTIDAS</span><strong>{save.totalRuns}</strong><small>tentativas</small></div><div><span>VITÓRIAS</span><strong>{save.victories}</strong><small>arenas</small></div><div><span>INIMIGOS</span><strong>{save.totalDefeated}</strong><small>derrotados</small></div><div><span>MELHOR COMBO</span><strong>x{save.bestCombo}</strong><small>sequência</small></div></div><div className="achievement-card"><Award size={20} /><div><span className="eyebrow">CONQUISTA DESBLOQUEADA</span><strong>Primeiro passo</strong><p>Complete sua primeira partida em qualquer modo.</p></div><span className="check-mark">✓</span></div></section>;
}

function Premium({ save, onBack, onNotice }: { save: GameSave; onBack: () => void; onNotice: (message: string) => void }) {
  return <section className="inner-screen"><ScreenHeader title="Shadow Rush Premium" eyebrow="EXPERIÊNCIA EXTRA" onBack={onBack} /><div className="premium-hero"><Crown size={32} /><span className="eyebrow">DEMONSTRAÇÃO WEB</span><h2>Mais sombra.<br /><em>Mesmo coração.</em></h2><p>O Premium valoriza o jogo sem bloquear nenhuma mecânica central.</p><span className="premium-badge">SEM COBRANÇA NESTA VERSÃO</span></div><div className="benefit-list"><Benefit icon={<VolumeX size={18} />} title="Sem anúncios" text="Remove banners, intersticiais e recompensados quando a compra real estiver validada." /><Benefit icon={<Sparkles size={18} />} title="Cosméticos exclusivos" text="Skins, rastros e efeitos visuais permanentes." /><Benefit icon={<Settings size={18} />} title="Personalização extra" text="Temas alternativos e mais opções de interface." /><Benefit icon={<Trophy size={18} />} title="Estatísticas ampliadas" text="Mais detalhes sobre sua evolução e recordes." /></div><button type="button" className="primary-button full-button" onClick={() => onNotice("Nenhuma compra foi iniciada. Google Play Billing ainda precisa ser configurado no app Android.")}><Crown size={17} /> Ver demonstração Premium</button><p className="small-note center">{save.settings.language === "pt-BR" ? "No web demo, pagamentos não são processados nem marcados como concluídos." : ""}</p></section>;
}

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="benefit"><span>{icon}</span><div><strong>{title}</strong><p>{text}</p></div></div>;
}

function SettingsScreen({ save, updateSave, onBack, onReset }: { save: GameSave; updateSave: (mutate: (current: GameSave) => GameSave) => void; onBack: () => void; onReset: () => void }) {
  const setting = (key: keyof GameSave["settings"], value: boolean | number) => updateSave((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  return <section className="inner-screen"><ScreenHeader title="Configurações" eyebrow="SEU RITMO, SUAS REGRAS" onBack={onBack} /><div className="settings-group"><SettingToggle icon={save.settings.music ? <Volume2 size={18} /> : <VolumeX size={18} />} label="Música" value={save.settings.music} onChange={(value) => setting("music", value)} /><SettingToggle icon={<Zap size={18} />} label="Efeitos sonoros" value={save.settings.sounds} onChange={(value) => setting("sounds", value)} /><SettingToggle icon={<Bell size={18} />} label="Vibração" value={save.settings.vibration} onChange={(value) => setting("vibration", value)} /><SettingToggle icon={<Sparkles size={18} />} label="Partículas extras" value={save.settings.particles} onChange={(value) => setting("particles", value)} /></div><div className="settings-card"><div className="setting-label"><span>Volume geral</span><strong>{Math.round(save.settings.volume * 100)}%</strong></div><input type="range" min="0" max="1" step="0.05" value={save.settings.volume} onChange={(event) => setting("volume", Number(event.target.value))} /><div className="setting-label"><span>Sensibilidade</span><strong>{save.settings.sensitivity === 1 ? "Normal" : save.settings.sensitivity < 1 ? "Suave" : "Alta"}</strong></div><input type="range" min="0.7" max="1.4" step="0.1" value={save.settings.sensitivity} onChange={(event) => setting("sensitivity", Number(event.target.value))} /></div><div className="settings-card info-card"><Shield size={18} /><div><strong>Dados locais e offline</strong><p>Seu progresso fica apenas neste aparelho. Desinstalar o app ou limpar os dados pode apagá-lo. O jogo continua jogável sem internet.</p></div></div><button type="button" className="danger-button" onClick={onReset}>Apagar progresso local</button><p className="small-note">Idioma: português (Brasil) · Qualidade adaptativa · Controles touch e teclado no desktop.</p></section>;
}

function SettingToggle({ icon, label, value, onChange }: { icon: React.ReactNode; label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" className="setting-row" onClick={() => onChange(!value)}><span className="setting-icon">{icon}</span><span>{label}</span><span className={`switch ${value ? "on" : ""}`}><span /></span></button>;
}

function Credits({ onBack }: { onBack: () => void }) {
  return <section className="inner-screen"><ScreenHeader title="Sobre o jogo" eyebrow="TRANSPARÊNCIA" onBack={onBack} /><div className="credits-card"><div className="brand-emblem small"><span>SR</span></div><h2>Shadow Rush</h2><p>Um arcade original de fantasia sombria, construído para sessões curtas, controles confortáveis e progresso justo.</p><div className="credit-line"><strong>Offline primeiro</strong><span>Sem login, sem servidor obrigatório</span></div><div className="credit-line"><strong>Anúncios</strong><span>Modo de demonstração; integração AdMob não configurada</span></div><div className="credit-line"><strong>Compras</strong><span>Nenhuma cobrança no web demo; Google Play Billing será validado no Android</span></div><div className="credit-line"><strong>Privacidade</strong><span>Não coletamos dados pessoais nesta versão</span></div></div><p className="small-note">Arte, nomes, sons e mecânicas desta experiência foram criados como conteúdo original. Para publicar na Google Play, configure Capacitor, ícones finais, política de privacidade pública, AdMob/consentimento e Billing com SDKs oficiais.</p></section>;
}

export default Index;
