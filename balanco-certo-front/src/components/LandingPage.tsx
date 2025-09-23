// src/components/LandingPage.tsx
// Versão atualizada em: 17 de Setembro de 2025
import './LandingPage.css';

// IMPORTANTE: Confirme se o nome do arquivo do seu logo está correto
import logoBalançoCerto from '../assets/balanco-Certo-logo.png';

const LandingPage = () => {

  return (
    <div className="landing-container dark-theme">
      <header className="landing-header">
        <div className="header-left">
          <div className="logo-container">
            <img src={logoBalançoCerto} alt="Balanço Certo Logo" className="logo" />
          </div>
        </div>
        <nav className="header-center">
          <a href="#funcionalidades">Como funciona?</a>
          <a href="#planos">Preço</a>
          <a href="#contato">Fale Conosco</a>
        </nav>
        <div className="header-right">
          <a href="/login" className="cta-button-header">Entrar</a>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-text">
            <h2>
              Tenha a <span className="highlight-text">gestão financeira</span> da sua empresa do jeito certo.
            </h2>
            <p>
              Simplifique suas faturas, controle suas despesas e tenha clareza
              total do seu fluxo de caixa. Perfeito para autônomos e pequenas empresas.
            </p>
            <button className="cta-button">Ver Demo</button>
          </div>
          <div className="hero-visual">
            <div className="visual-placeholder">
              <div>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10M18 20V4M6 20V16"/></svg>
                <span>Visual do App</span>
              </div>
            </div>
          </div>
        </section>

        <section id="funcionalidades" className="content-section">
          <div className="section-intro">
            <h2>Tome o Controle das Suas Finanças em 3 Passos Simples</h2>
            <p>Chega de planilhas complicadas e dados perdidos. Veja como o Balanço Certo simplifica sua gestão financeira do início ao fim.</p>
          </div>
          <div className="steps-container">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Conecte e Centralize Tudo</h3>
              <p className="step-description">
                Diga adeus à entrada manual de dados. Conecte suas contas, importe notas fiscais e digitalize despesas com uma foto. Todas as suas informações financeiras em um único lugar.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Visualize e Entenda Suas Finanças</h3>
              <p className="step-description">
                Nossa plataforma categoriza suas transações e concilia suas contas automaticamente. Veja em dashboards intuitivos para onde seu dinheiro está indo e qual a real saúde do seu negócio.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Planeje e Cresça com Confiança</h3>
              <p className="step-description">
                Com relatórios claros de fluxo de caixa e DRE, tome decisões baseadas em dados reais. Projete seus lucros, antecipe impostos e foque no crescimento da sua empresa.
              </p>
            </div>
          </div>
        </section>

        <section id="planos" className="content-section alternate-bg">
          <div className="section-intro">
            <h2>Planos flexíveis para cada fase do seu negócio</h2>
            <p>Comece de graça e cresça conosco. Todos os planos anuais garantem 2 meses de desconto.</p>
          </div>
          <div className="pricing-container">
            <div className="pricing-card">
              <div className="card-header">
                <h3>Autônomo</h3>
                <p className="price">R$ 29<span className="price-suffix">,90/mês</span></p>
              </div>
              <ul className="features-list">
                <li><span className="check-icon">✔</span> 1 Usuário</li>
                <li><span className="check-icon">✔</span> Até 30 lançamentos/mês</li>
                <li><span className="check-icon">✔</span> Emissão de faturas e orçamentos</li>
                <li><span className="check-icon">✔</span> Cadastro de clientes</li>
                <li><span className="check-icon">✔</span> Relatórios simples</li>
              </ul>
              <button className="cta-button-outline">Escolher Plano</button>
            </div>
            <div className="pricing-card popular">
              <div className="popular-badge">MAIS POPULAR</div>
              <div className="card-header">
                <h3>PME</h3>
                <p className="price">R$ 79<span className="price-suffix">,90/mês</span></p>
              </div>
              <ul className="features-list">
                <li><span className="check-icon">✔</span> <b>Tudo do plano Autônomo, mais:</b></li>
                <li><span className="check-icon">✔</span> Até 5 Usuários</li>
                <li><span className="check-icon">✔</span> Lançamentos ilimitados</li>
                <li><span className="check-icon">✔</span> Conciliação bancária automática</li>
                <li><span className="check-icon">✔</span> Relatórios completos (DRE, Fluxo de Caixa)</li>
                <li><span className="check-icon">✔</span> Suporte via chat</li>
              </ul>
              <button className="cta-button">Iniciar Teste Grátis</button>
            </div>
            <div className="pricing-card">
              <div className="card-header">
                <h3>Crescimento</h3>
                <p className="price">R$ 149<span className="price-suffix">,90/mês</span></p>
              </div>
              <ul className="features-list">
                <li><span className="check-icon">✔</span> <b>Tudo do plano PME, mais:</b></li>
                <li><span className="check-icon">✔</span> Usuários ilimitados</li>
                <li><span className="check-icon">✔</span> Relatórios avançados e personalizados</li>
                <li><span className="check-icon">✔</span> Acesso via API para integrações</li>
                <li><span className="check-icon">✔</span> Suporte prioritário</li>
              </ul>
              <button className="cta-button-outline">Fale Conosco</button>
            </div>
          </div>
          <div className="faq-section">
              <h4>Perguntas Frequentes</h4>
              <div className="faq-item">
                  <p className="faq-question">Posso cancelar quando quiser?</p>
                  <p className="faq-answer">Sim! Você pode cancelar sua assinatura a qualquer momento, sem taxas ou burocracia.</p>
              </div>
              <div className="faq-item">
                  <p className="faq-question">Meus dados financeiros estão seguros?</p>
                  <p className="faq-answer">Absolutamente. Usamos criptografia de ponta e seguimos as melhores práticas de segurança do mercado, as mesmas utilizadas por grandes bancos.</p>
              </div>
              <div className="faq-item">
                  <p className="faq-question">Vocês emitem nota fiscal pela assinatura?</p>
                  <p className="faq-answer">Sim, a nota fiscal de serviço (NFS-e) referente à sua assinatura é emitida e enviada automaticamente para o seu e-mail de cadastro.</p>
              </div>
          </div>
        </section>
      </main>

      <footer id="contato" className="footer-section">
        <div className="section-intro">
          <h2>Ficou com alguma dúvida?</h2>
          <p>Envie sua mensagem e nossa equipe responderá o mais rápido possível.</p>
        </div>
        <form 
          action="https://formspree.io/f/xgvlpyjq" 
          method="POST" 
          className="contact-form-footer"
        >
          <input type="text" name="name" placeholder="Seu nome" required />
          <input type="email" name="email" placeholder="Seu melhor e-mail" required />
          <textarea name="message" rows={5} placeholder="Sua mensagem" required></textarea>
          <button type="submit" className="cta-button">Enviar Mensagem</button>
        </form>
        <div className="footer-bottom">
          <p>© 2025 Balanço Certo. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;