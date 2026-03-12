import React, { useState, useEffect } from 'react';

/**
 * EmbedContent - 解析并渲染嵌入内容
 * 支持：YouTube, Twitter/X, Vimeo, CodePen, GitHub Gist, Spotify 等
 */
const EmbedContent = ({ content }) => {
  const [embeds, setEmbeds] = useState([]);

  useEffect(() => {
    if (!content) {
      setEmbeds([]);
      return;
    }

    const detectedEmbeds = detectEmbeds(content);
    setEmbeds(detectedEmbeds);
  }, [content]);

  if (embeds.length === 0) {
    return null;
  }

  return (
    <div className="embed-container space-y-4 mt-4">
      {embeds.map((embed, index) => (
        <div key={index} className="embed-item rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-color)' }}>
          {renderEmbed(embed)}
        </div>
      ))}
    </div>
  );
};

/**
 * 检测内容中的嵌入链接
 */
function detectEmbeds(content) {
  const embeds = [];
  
  // YouTube
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
  let match;
  while ((match = youtubeRegex.exec(content)) !== null) {
    embeds.push({
      type: 'youtube',
      id: match[1],
      url: match[0]
    });
  }

  // Twitter/X
  const twitterRegex = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/g;
  while ((match = twitterRegex.exec(content)) !== null) {
    embeds.push({
      type: 'twitter',
      id: match[1],
      url: match[0]
    });
  }

  // Vimeo
  const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/g;
  while ((match = vimeoRegex.exec(content)) !== null) {
    embeds.push({
      type: 'vimeo',
      id: match[1],
      url: match[0]
    });
  }

  // Spotify
  const spotifyRegex = /(?:https?:\/\/)?open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/g;
  while ((match = spotifyRegex.exec(content)) !== null) {
    embeds.push({
      type: 'spotify',
      contentType: match[1],
      id: match[2],
      url: match[0]
    });
  }

  // CodePen
  const codepenRegex = /(?:https?:\/\/)?codepen\.io\/(\w+)\/pen\/(\w+)/g;
  while ((match = codepenRegex.exec(content)) !== null) {
    embeds.push({
      type: 'codepen',
      user: match[1],
      id: match[2],
      url: match[0]
    });
  }

  // GitHub Gist
  const gistRegex = /(?:https?:\/\/)?gist\.github\.com\/(\w+)\/([a-f0-9]+)/g;
  while ((match = gistRegex.exec(content)) !== null) {
    embeds.push({
      type: 'gist',
      user: match[1],
      id: match[2],
      url: match[0]
    });
  }

  // Bilibili
  const bilibiliRegex = /(?:https?:\/\/)?(?:www\.)?bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/g;
  while ((match = bilibiliRegex.exec(content)) !== null) {
    embeds.push({
      type: 'bilibili',
      id: match[1],
      url: match[0]
    });
  }

  return embeds;
}

/**
 * 渲染嵌入内容
 */
function renderEmbed(embed) {
  switch (embed.type) {
    case 'youtube':
      return (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${embed.id}`}
            title="YouTube video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );

    case 'twitter':
      return (
        <div className="p-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <a
            href={embed.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span>查看推文</span>
            <ExternalLink size={14} />
          </a>
        </div>
      );

    case 'vimeo':
      return (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://player.vimeo.com/video/${embed.id}`}
            title="Vimeo video"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      );

    case 'spotify':
      return (
        <iframe
          className="w-full"
          height="152"
          src={`https://open.spotify.com/embed/${embed.contentType}/${embed.id}?utm_source=generator`}
          frameBorder="0"
          allowFullScreen=""
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      );

    case 'codepen':
      return (
        <iframe
          className="w-full"
          height="400"
          src={`https://codepen.io/${embed.user}/embed/${embed.id}?height=400&default-tab=result`}
          frameBorder="0"
          scrolling="no"
          title="CodePen embed"
          allowFullScreen
        />
      );

    case 'gist':
      return (
        <iframe
          className="w-full"
          height="300"
          src={`https://gist.github.com/${embed.user}/${embed.id}.pibb`}
          frameBorder="0"
          title="GitHub Gist"
        />
      );

    case 'bilibili':
      return (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://player.bilibili.com/player.html?bvid=${embed.id}&high_quality=1`}
            title="Bilibili video"
            frameBorder="0"
            allowFullScreen
          />
        </div>
      );

    default:
      return null;
  }
}

// ExternalLink icon component
const ExternalLink = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

export default EmbedContent;