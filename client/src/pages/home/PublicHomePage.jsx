import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Play, Send } from "lucide-react";
import logo from "../../assets/Logo/M1.svg";
import phones from "../../assets/marketing/phones.png";
import facial from "../../assets/marketing/facial.jpg";
import waxing from "../../assets/marketing/waxing.jpg";
import massage from "../../assets/marketing/massage.jpg";
import whyChoose from "../../assets/marketing/why-choose.jpg";
import whyExperience from "../../assets/marketing/why-experience.png";
import whyProducts from "../../assets/marketing/why-products.png";
import whySupport from "../../assets/marketing/why-support.png";
import whyProfessionals from "../../assets/marketing/why-professionals.png";
import tourDots from "../../assets/marketing/tour-dots.png";
import tourPhone from "../../assets/marketing/tour-phone.png";
import tourTeam from "../../assets/marketing/tour-team.png";
import brandRaaga from "../../assets/marketing/brand-raaga.png";
import brandO3 from "../../assets/marketing/brand-o3.png";
import brandVlcc from "../../assets/marketing/brand-vlcc.png";
import brandRica from "../../assets/marketing/brand-rica.png";
import tipGlowing from "../../assets/marketing/tip-glowing.jpg";
import tipRelaxation from "../../assets/marketing/tip-relaxation.jpg";
import tipSelfCare from "../../assets/marketing/tip-selfcare.jpg";
import newsletterPhone from "../../assets/marketing/newsletter-phone.png";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.wemakeover.app";

const services = [
  {
    title: "Premium Range of Facials",
    price: "Starting at just ₹699",
    image: facial,
  },
  {
    title: "Waxing",
    price: "Starting at just ₹249",
    image: waxing,
  },
  {
    title: "Massage",
    price: "Starting at just ₹199",
    image: massage,
  },
];

const reasons = [
  {
    title: "Premium & Best Experience",
    body: "Thoughtfully curated beauty services designed to give you a premium, relaxing experience right at your doorstep.",
    icon: whyExperience,
  },
  {
    title: "Original & Authentic Products",
    body: "We use trusted, authentic beauty products chosen to deliver safe, effective, and beautiful results.",
    icon: whyProducts,
  },
  {
    title: "24/7 Support",
    body: "From booking to after-service care, our team is always here to assist you whenever you need us.",
    icon: whySupport,
  },
  {
    title: "Certified & Trained Professionals",
    body: "Skilled beauty professionals trained to deliver every service with care, precision, and professionalism.",
    icon: whyProfessionals,
  },
];

const brands = [
  {
    name: "Raaga Professional",
    body: "Raaga products are used for facial, detan & waxing services",
    bodyClass: "w-[149px]",
    logo: brandRaaga,
    frame: "left-5 top-[9px] h-[42px] w-20",
  },
  {
    name: "O3+ Professional",
    body: "O3+ products are used for facial, Spa & waxing services",
    logo: brandO3,
    frame: "-top-[3px] left-[26px] size-[76px]",
  },
  {
    name: "VLCC",
    body: "VLCC products are used for facial, detan & cleanup",
    logo: brandVlcc,
    frame: "left-5 top-[9px] h-[38px] w-[69px]",
  },
  {
    name: "RICA",
    body: "RICA products are used for waxing services",
    logo: brandRica,
    frame: "left-[30px] top-[9px] size-12",
  },
];

const tips = [
  { title: "Glowing Skin Home Remedies", by: "wemakeover", image: tipGlowing },
  { title: "Relaxation guides 2026", by: "wemakeover", image: tipRelaxation },
  {
    title: "Self care routines",
    by: "wemakeover",
    image: tipSelfCare,
    imageClass: "object-left",
  },
];

function HeroDots({ className = "", style, fill = "#D9D9D9" }) {
  const rows = [0, 24, 48, 72, 96, 120, 144, 168];
  const circles = [76, 112, 148, 184, 220, 256];
  return (
    <svg
      aria-hidden
      viewBox="0 0 260 176"
      className={`pointer-events-none ${className}`}
      style={style}
    >
      {rows.map((y) => (
        <g key={y} transform={`translate(0 ${y})`}>
          <ellipse cx="4.5" cy="4" rx="4.5" ry="4" fill={fill} opacity="0.3" />
          <ellipse cx="40.5" cy="4" rx="4.5" ry="4" fill={fill} opacity="0.3" />
          {circles.map((cx) => (
            <circle key={cx} cx={cx} cy="4" r="4" fill={fill} opacity="0.3" />
          ))}
        </g>
      ))}
    </svg>
  );
}

function DownloadButton({ tone = "light" }) {
  const light = tone === "light";
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm ${
        light ? "bg-white text-[#CC2B52]" : "bg-[#CC2B52] text-white"
      }`}
    >
      <Play size={14} fill="currentColor" />
      Download App
    </a>
  );
}

export default function PublicHomePage() {
  const [subscribed, setSubscribed] = useState(false);

  const onSubscribe = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    if (!name || !email.includes("@")) return;
    setSubscribed(true);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f2f3] text-[#1c1c28]">
      <section className="relative">
        <div className="relative hidden min-[1100px]:block">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 bg-[#CC2B52]"
            style={{ height: "calc(674 / 838 * 100%)" }}
          />
          <div className="relative z-[2] mx-auto w-full max-w-[1500px]">
          <div
            className="relative w-full"
            style={{ paddingBottom: "calc(838 / 1500 * 100%)" }}
          >
            <header className="absolute left-[4.8%] right-[4.8%] top-[4.2%] z-20 flex items-start justify-between text-white">
              <div>
                <img src={logo} alt="wemakeover" className="h-8 w-auto brightness-0 invert" />
                <p className="mt-1 text-[11px] tracking-wide text-white/85">
                  Premium Salon Experience Right At Your Doorstep
                </p>
              </div>
              <a
                href="mailto:hello@wemakeover.co.in"
                className="inline-flex items-center gap-2 pt-1 text-sm text-white/95"
              >
                <Mail size={16} />
                hello@wemakeover.co.in
              </a>
            </header>

            <div className="absolute left-[4.8%] top-[32%] z-20 max-w-[42%] text-white">
              <h1 className="text-[clamp(2.4rem,4.2vw,4rem)] font-semibold leading-[1.08] tracking-tight">
                wemakeover is now
                <br />
                on play store!
              </h1>
              <div className="mt-8">
                <DownloadButton />
              </div>
            </div>

            <HeroDots
              className="absolute z-0"
              style={{
                top: "calc(197 / 838 * 100%)",
                left: "calc(1120 / 1500 * 100%)",
                width: "calc(260 / 1500 * 100%)",
                height: "calc(176 / 838 * 100%)",
              }}
            />
            <img
              src={phones}
              alt="Wemakeover app on two phones"
              className="absolute z-10 h-auto max-w-none"
              style={{
                left: "calc(842 / 1500 * 100%)",
                top: "calc(206 / 838 * 100%)",
                width: "calc(483 / 1500 * 100%)",
              }}
            />
          </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-[#CC2B52] px-5 pb-0 pt-5 text-white min-[1100px]:hidden">
          <header className="relative z-20 flex items-center justify-between gap-3">
            <img src={logo} alt="wemakeover" className="h-7 w-auto brightness-0 invert" />
            <a
              href="mailto:hello@wemakeover.co.in"
              className="inline-flex shrink-0 items-center gap-2 text-xs text-white/95"
            >
              <Mail size={16} />
              <span className="hidden sm:inline">hello@wemakeover.co.in</span>
            </a>
          </header>
          <p className="relative z-20 mt-3 max-w-[18rem] text-[11px] leading-4 tracking-wide text-white/85">
            Premium Salon Experience Right At Your Doorstep
          </p>
          <h1 className="relative z-20 mt-8 text-[1.85rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            wemakeover is now
            <br />
            on play store!
          </h1>
          <div className="relative z-20 mt-6">
            <DownloadButton />
          </div>
          <div className="relative mt-4">
            <HeroDots className="absolute right-0 top-2 h-24 w-36 sm:h-28 sm:w-44" />
            <img
              src={phones}
              alt="Wemakeover app on two phones"
              className="relative z-10 ml-auto w-[min(78%,320px)]"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#f4f2f3]">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[0.85fr_1.35fr] lg:gap-10 lg:py-20">
          <div>
            <h2 className="text-3xl font-semibold leading-tight text-[#CC2B52] sm:text-4xl">
              Salon &amp; Grooming
              <br />
              At Your Doorsteps
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#5c5660]">
              Get the most premium salon experience at your doorstep. We promise
              we&apos;ll light you up an experience like never before.
            </p>
            <div className="mt-7">
              <DownloadButton tone="solid" />
            </div>
          </div>
          <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
            {services.map((service) => (
              <figure key={service.title} className="w-40 shrink-0 text-center sm:w-auto">
                <img
                  src={service.image}
                  alt={service.title}
                  className="aspect-square w-full rounded-[1.4rem] object-cover"
                />
                <figcaption className="mt-3">
                  <p className="text-sm font-medium text-[#1c1c28]">{service.title}</p>
                  <p className="mt-0.5 text-xs text-[#6d6670]">{service.price}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f6f4f5]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div>
            <h2 className="text-3xl font-semibold text-[#1c1c28] sm:text-4xl">Why Choose Us</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-[#6b6570]">
              Our primary goal is to create the best in class experience for our
              customers. If we stick with that philosophy, then is an opportunity
              to serve you and we&apos;ll make the service worth it and the most
              memorable experience ever for you.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-8 sm:gap-y-8">
              {reasons.map(({ title, body, icon }) => (
                <div key={title}>
                  <img src={icon} alt="" className="mb-3 h-auto w-auto" />
                  <h3 className="text-sm font-semibold text-[#1c1c28]">{title}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-[#6d6670]">{body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
            <HeroDots
              fill="#F9BF29"
              className="absolute z-0 h-auto w-[50.9%]"
              style={{ left: "-15%", top: "-8.3%" }}
            />
            <img
              src={whyChoose}
              alt="A Wemakeover professional giving a facial at home"
              className="relative z-10 aspect-[515/629] w-full rounded-[10px] object-cover object-top"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#f4f2f3]">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-12 sm:px-8 lg:grid-cols-2 lg:gap-10 lg:py-20">
          <div className="relative mx-auto w-full max-w-[765px]">
            <div className="relative w-full" style={{ paddingBottom: "calc(598 / 765 * 100%)" }}>
              <img
                src={tourDots}
                alt=""
                className="absolute z-0"
                style={{
                  left: 0,
                  top: 0,
                  width: "calc(262 / 765 * 100%)",
                  height: "calc(176 / 598 * 100%)",
                }}
              />
              <img
                src={tourPhone}
                alt="Wemakeover app on a phone"
                className="absolute z-10"
                style={{
                  left: "calc(112 / 765 * 100%)",
                  top: "calc(39 / 598 * 100%)",
                  width: "calc(422 / 765 * 100%)",
                  height: "calc(514 / 598 * 100%)",
                }}
              />
              <img
                src={tourTeam}
                alt="Wemakeover professionals"
                className="absolute z-20"
                style={{
                  left: "calc(433 / 765 * 100%)",
                  top: "calc(200 / 598 * 100%)",
                  width: "calc(332 / 765 * 100%)",
                  height: "calc(398 / 598 * 100%)",
                }}
              />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Take a tour to our application &amp; founder&apos;s message
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#5c5660]">
              Explore our app to discover beauty and wellness services, book
              trusted professionals at your doorstep, and enjoy a seamless
              experience designed around you. Then, hear directly from our
              founder about the vision behind Wemakeover and our commitment to
              making self-care more accessible, personal, and effortless.
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[#5c5660]">
              <li>Discover beauty, grooming &amp; wellness services for every occasion.</li>
              <li>Choose your service, time and location all from the app.</li>
              <li>Enjoy professional services delivered to your doorstep.</li>
              <li>Learn the story, purpose and vision behind Wemakeover.</li>
            </ul>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[#CC2B52] px-5 py-2.5 text-center text-sm font-semibold text-white sm:text-left"
              >
                Take A Tour
              </a>
              <a
                href="mailto:hello@wemakeover.co.in"
                className="rounded-full border border-[#CC2B52] px-5 py-2.5 text-center text-sm font-semibold text-[#CC2B52] sm:text-left"
              >
                Founder&apos;s Message
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-8 px-5 py-10 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {brands.map((brand) => (
            <div key={brand.name} className="flex items-start gap-3">
              <div className="relative h-[76px] w-[108px] shrink-0">
                <div className="absolute left-0 top-0 size-[60px] rounded-[10px] bg-[rgba(204,43,82,0.3)]" />
                <img
                  src={brand.logo}
                  alt=""
                  className={`absolute max-w-none object-contain ${brand.frame}`}
                />
              </div>
              <div className="min-w-0 pt-1">
                <p className="text-sm font-bold leading-[22px] text-black">{brand.name}</p>
                <p className={`text-sm leading-[22px] text-[#6a6a6a] ${brand.bodyClass ?? ""}`}>{brand.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-12 text-center sm:px-8 lg:py-16">
        <h2 className="text-3xl font-semibold sm:text-4xl">Testimonials</h2>
        <p className="mt-6 text-sm leading-6 text-[#5c5660]">
          I had a great experience with wemakeover. The staff was very good and
          professional and would love to book again.
        </p>
        <div className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#f8e7ec] text-sm font-semibold text-[#CC2B52]">
          AS
        </div>
        <p className="mt-3 text-sm font-medium">Aarushi Sakuja</p>
      </section>

      <section className="bg-[#f4f2f3] px-5 py-12 sm:px-8 lg:py-16 min-[1100px]:pb-28">
        <div className="mx-auto max-w-[1140px]">
          <h2 className="text-3xl font-semibold leading-tight sm:text-[32px] sm:leading-[41px]">
            Tips From Wemakeover
          </h2>
          <div className="mt-9 grid gap-[30px] md:grid-cols-3">
            {tips.map((tip) => (
              <article key={tip.title}>
                <img
                  src={tip.image}
                  alt=""
                  className={`aspect-[1024/682] w-full rounded-[10px] object-cover ${tip.imageClass ?? ""}`}
                />
                <h3 className="mt-11 text-base font-semibold leading-[23px] text-black">{tip.title}</h3>
                <p className="mt-1 text-base leading-[23px] text-[#6a6a6a]">by {tip.by}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-white">
        <div className="relative mx-auto max-w-[1500px] min-[1100px]:h-[400px]">
          <form
            onSubmit={onSubscribe}
            className="px-5 py-10 sm:px-8 min-[1100px]:absolute min-[1100px]:left-[calc(180/1500*100%)] min-[1100px]:top-[140px] min-[1100px]:w-[602px] min-[1100px]:p-0"
          >
            <div className="flex items-center gap-2.5 text-[#2f2f2f]">
              <Mail className="size-6 shrink-0" strokeWidth={1.5} aria-hidden />
              <h2 className="text-base font-semibold leading-6">Subscribe to Newsletter</h2>
            </div>
            {subscribed ? (
              <p className="mt-6 text-sm text-[#CC2B52]">Thanks. You&apos;re on the list.</p>
            ) : (
              <div className="mt-6 flex flex-col gap-3 min-[1100px]:mt-[26px] min-[1100px]:flex-row min-[1100px]:items-center min-[1100px]:gap-[15px]">
                <input
                  name="name"
                  required
                  placeholder="Enter your name"
                  className="h-12 w-full rounded-[10px] border border-[#ccc] px-5 text-sm text-[#2f2f2f] outline-none placeholder:text-[#2f2f2f] min-[1100px]:w-[262px]"
                />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Enter your e-mail"
                  className="h-12 w-full rounded-[10px] border border-[#ccc] px-5 text-sm text-[#2f2f2f] outline-none placeholder:text-[#2f2f2f] min-[1100px]:w-[262px]"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-[#CC2B52] text-white"
                >
                  <Send className="size-5" aria-hidden />
                </button>
              </div>
            )}
          </form>
          <img
            src={newsletterPhone}
            alt="Our app is now live on Google Play"
            className="relative z-10 mx-auto mb-10 w-[min(72%,260px)] min-[1100px]:absolute min-[1100px]:left-[calc(981/1500*100%)] min-[1100px]:top-[-93px] min-[1100px]:mb-0 min-[1100px]:w-[calc(256/1500*100%)] min-[1100px]:max-w-none"
          />
        </div>
      </section>

      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl text-sm text-[#5c5660]">
            <p>For Bookings &amp; Career Call Us | 8725885899</p>
            <p className="mt-2">Gaya • Patna • Kolkata • Ranchi • Jamshedpur</p>
            <p className="mt-3 text-xs leading-5">
              Wemakeover brings premium beauty and self-care services to your
              doorstep. From relaxing facials and massages to grooming, waxing
              and makeup, our trained experts make every experience effortless,
              comfortable and personalised.
            </p>
          </div>
          <DownloadButton />
        </div>
        <div className="border-t border-gray-100">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-4 text-xs text-[#6d6670] sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p>Copyright 2026 WEMAKEOVER OPC PVT LTD. All Rights Reserved.</p>
            <div className="flex gap-4">
              <Link to="/terms" className="hover:text-[#CC2B52]">
                Terms &amp; Conditions
              </Link>
              <Link to="/privacy" className="hover:text-[#CC2B52]">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
