import { faAngleUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import './BotaoTopo.css'

export default function BotaoTopo({ limite = 200 }) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisivel(window.scrollY > limite);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [limite]);

  const irParaTopo = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visivel) return null;

  return (
    <button
      className="botao-topo"
      onClick={irParaTopo}
      aria-label="Voltar ao topo da página"
    >
      <FontAwesomeIcon icon={faAngleUp} />
    </button>
  )
}
