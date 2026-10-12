const Footer = () => {
  return (
    <footer>
      <div className="sitewidth">
        v0.7{" "}
        <a
          href="https://github.com/ro-mat/MrMetis"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>{" "}
        MrMetis {new Date().getFullYear()} &copy;
      </div>
    </footer>
  );
};

export default Footer;
